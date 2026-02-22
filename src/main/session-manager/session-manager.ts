import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { listItems, replaceTasksAndDecisions } from '@main/storage/mindtree-storage'
import { getAppDataPath, readJson } from '@main/storage/storage-manager'

interface SessionInfo {
  projectId: string
  cwd: string
  claudeSessionId: string | null
}

interface AppConfigPartial {
  sessionManager?: {
    model?: 'haiku' | 'sonnet' | 'opus'
  }
}

interface ClaudeJsonOutput {
  result?: string
  is_error?: boolean
}

type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

interface SessionManagerSchema {
  tasks?: Array<{
    title: string
    status?: TaskStatus
    blockedReason?: string | null
    checklist?: string[]
  }>
  decisions?: Array<{
    title: string
  }>
}

class SessionManager {
  private sessions = new Map<string, SessionInfo>()
  private enabledSessions = new Set<string>()
  private pendingPrompts = new Map<string, string[]>()
  private activeProcesses = new Map<string, ChildProcess>()
  private mainWindow: BrowserWindow | null = null

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
  }

  registerSession(wsidnSessionId: string, info: SessionInfo): void {
    this.sessions.set(wsidnSessionId, info)
  }

  updateClaudeSession(wsidnSessionId: string, claudeSessionId: string | null): void {
    const info = this.sessions.get(wsidnSessionId)
    console.log(`[SessionManager] updateClaudeSession: wsidnId=${wsidnSessionId} claudeSessionId=${claudeSessionId} sessionKnown=${!!info} smEnabled=${this.enabledSessions.has(wsidnSessionId)}`)
    if (info) {
      info.claudeSessionId = claudeSessionId
    }
  }

  unregisterSession(wsidnSessionId: string): void {
    this.killActive(wsidnSessionId)
    this.pendingPrompts.delete(wsidnSessionId)
    this.enabledSessions.delete(wsidnSessionId)
    this.sessions.delete(wsidnSessionId)
  }

  setEnabled(
    wsidnSessionId: string,
    enabled: boolean,
    info?: { projectId: string; cwd: string; claudeSessionId: string | null }
  ): void {
    if (enabled) {
      if (info) {
        this.sessions.set(wsidnSessionId, info)
      }
      this.enabledSessions.add(wsidnSessionId)
      console.log(`[SessionManager] enabled: wsidnId=${wsidnSessionId} projectId=${info?.projectId} claudeSessionId=${info?.claudeSessionId} cwd=${info?.cwd}`)
    } else {
      this.killActive(wsidnSessionId)
      this.pendingPrompts.delete(wsidnSessionId)
      this.enabledSessions.delete(wsidnSessionId)
      console.log(`[SessionManager] disabled: wsidnId=${wsidnSessionId}`)
    }
  }

  isEnabled(wsidnSessionId: string): boolean {
    return this.enabledSessions.has(wsidnSessionId)
  }

  onPromptSubmit(wsidnSessionId: string, prompt: string): void {
    const isEnabled = this.enabledSessions.has(wsidnSessionId)
    const sessionInfo = this.sessions.get(wsidnSessionId)
    console.log(`[SessionManager] onPromptSubmit: wsidnId=${wsidnSessionId} enabled=${isEnabled} sessionKnown=${!!sessionInfo} claudeSessionId=${sessionInfo?.claudeSessionId ?? 'none'}`)
    if (!isEnabled) {
      console.log(`[SessionManager] onPromptSubmit: SKIPPED — session not enabled`)
      return
    }

    // Accumulate prompt
    const existing = this.pendingPrompts.get(wsidnSessionId) ?? []
    existing.push(prompt)
    this.pendingPrompts.set(wsidnSessionId, existing)
    console.log(`[SessionManager] onPromptSubmit: accumulated ${existing.length} prompt(s)`)

    // Kill active process — close handler will re-run with accumulated prompts
    if (this.activeProcesses.has(wsidnSessionId)) {
      console.log(`[SessionManager] onPromptSubmit: active process found — killing and requeueing`)
      this.killActive(wsidnSessionId)
      return
    }

    // No active process — start immediately
    console.log(`[SessionManager] onPromptSubmit: starting run()`)
    this.run(wsidnSessionId).catch((err) => {
      console.error(`[SessionManager] run error for ${wsidnSessionId}:`, err)
    })
  }

  private killActive(wsidnSessionId: string): void {
    const proc = this.activeProcesses.get(wsidnSessionId)
    if (proc) {
      try { proc.kill() } catch { /* ignore */ }
      this.activeProcesses.delete(wsidnSessionId)
    }
  }

  private getSystemPrompt(): string {
    const promptPath = getAppDataPath('session-manager-prompt.md')
    if (existsSync(promptPath)) {
      return readFileSync(promptPath, 'utf-8')
    }
    return 'Output a JSON object with "tasks" and "decisions" arrays based on the user prompts.'
  }

  private getModel(): string {
    const config = readJson<AppConfigPartial>(getAppDataPath('config.json'), {})
    return config.sessionManager?.model ?? 'haiku'
  }

  private buildInputText(prompts: string[], claudeSessionId: string, projectId: string): string {
    const promptList = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')

    const items = listItems(projectId, claudeSessionId)
    const tasks = items.filter((t) => t.category === 'task' && !t.parentId)
    const decisions = items.filter((t) => t.category === 'decision')

    const taskLines = tasks.map((t) => {
      const children = items.filter((c) => c.parentId === t.id)
      const childLines = children.map((c) => `    - ${c.title}`).join('\n')
      const statusStr = t.status === 'blocked' ? `[blocked: ${t.description || '?'}]` : `[${t.status}]`
      return childLines
        ? `- ${statusStr} ${t.title}\n${childLines}`
        : `- ${statusStr} ${t.title}`
    })
    const decisionLines = decisions.map((d) => `- ${d.title}`)

    return [
      'User prompts:',
      promptList,
      '',
      'Current Mind Tree:',
      'Tasks:',
      taskLines.length > 0 ? taskLines.join('\n') : '(none)',
      'Decisions:',
      decisionLines.length > 0 ? decisionLines.join('\n') : '(none)',
    ].join('\n')
  }

  private parseOutput(output: string): SessionManagerSchema {
    // Try to parse as Claude JSON wrapper first
    let resultText = output.trim()
    try {
      const wrapper = JSON.parse(output) as ClaudeJsonOutput
      if (wrapper.is_error) throw new Error('Claude returned an error')
      if (typeof wrapper.result === 'string') {
        resultText = wrapper.result.trim()
      }
    } catch {
      // Not a JSON wrapper — use raw output
    }

    // Remove markdown fences if present
    resultText = resultText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

    // Try direct parse
    try {
      return JSON.parse(resultText) as SessionManagerSchema
    } catch {
      // Try to extract JSON object
      const match = resultText.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0]) as SessionManagerSchema
      }
      throw new Error(`Could not parse output as JSON: ${resultText.slice(0, 200)}`)
    }
  }

  private notifyRenderer(wsidnSessionId: string, projectId: string, claudeSessionId: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.SESSION_MANAGER_UPDATED, {
        wsidnSessionId,
        projectId,
        claudeSessionId,
      })
    }
  }

  private async run(wsidnSessionId: string): Promise<void> {
    const info = this.sessions.get(wsidnSessionId)
    console.log(`[SessionManager] run(): wsidnId=${wsidnSessionId} info=${JSON.stringify(info)}`)
    if (!info?.claudeSessionId) {
      // No Claude session yet — discard pending prompts
      console.log(`[SessionManager] run(): ABORTED — no claudeSessionId, discarding prompts`)
      this.pendingPrompts.delete(wsidnSessionId)
      return
    }

    const prompts = this.pendingPrompts.get(wsidnSessionId) ?? []
    this.pendingPrompts.delete(wsidnSessionId)
    if (prompts.length === 0) {
      console.log(`[SessionManager] run(): ABORTED — no pending prompts`)
      return
    }

    const { projectId, cwd, claudeSessionId } = info
    const systemPrompt = this.getSystemPrompt()
    const model = this.getModel()
    console.log(`[SessionManager] run(): projectId=${projectId} claudeSessionId=${claudeSessionId} model=${model} cwd=${cwd} prompts=${prompts.length}`)
    const inputText = this.buildInputText(prompts, claudeSessionId, projectId)
    console.log(`[SessionManager] run(): inputText length=${inputText.length}`)

    // Notify renderer that processing has started
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.SESSION_MANAGER_PROCESSING, {
        wsidnSessionId,
      })
    }

    // Write system prompt to temp file to avoid Windows shell arg-length/newline issues
    const promptFile = join(tmpdir(), `wsidn-sm-${Date.now()}.md`)
    writeFileSync(promptFile, systemPrompt, 'utf-8')
    console.log(`[SessionManager] wrote system prompt to ${promptFile}`)

    return new Promise<void>((resolve) => {
      const args = [
        '-p',
        '--output-format', 'json',
        '--model', model,
        '--system-prompt-file', promptFile,
      ]

      console.log(`[SessionManager] spawning: claude ${args.join(' ')}`)
      console.log(`[SessionManager] stdin will receive inputText (${inputText.length} chars)`)
      const proc = spawn('claude', args, {
        cwd,
        env: { ...process.env },
        windowsHide: true,
        shell: process.platform === 'win32',
      })
      console.log(`[SessionManager] spawned PID=${proc.pid ?? 'unknown'}`)

      // Send input text via stdin instead of positional arg (avoids shell quoting issues)
      proc.stdin?.write(inputText, 'utf-8')
      proc.stdin?.end()

      this.activeProcesses.set(wsidnSessionId, proc)

      let stdout = ''
      let wasKilled = false

      proc.stdout?.on('data', (chunk: Buffer) => {
        const s = chunk.toString()
        stdout += s
        console.log(`[SessionManager] stdout chunk: ${s.slice(0, 120)}`)
      })

      proc.stderr?.on('data', (chunk: Buffer) => {
        console.warn(`[SessionManager] stderr: ${chunk.toString().trim()}`)
      })

      proc.on('close', (code, signal) => {
        this.activeProcesses.delete(wsidnSessionId)
        wasKilled = !!signal
        console.log(`[SessionManager] close: code=${code} signal=${signal} wasKilled=${wasKilled} stdoutLen=${stdout.length}`)
        try { unlinkSync(promptFile) } catch { /* ignore */ }

        if (!wasKilled && code === 0) {
          try {
            console.log(`[SessionManager] raw stdout: ${stdout.slice(0, 500)}`)
            const schema = this.parseOutput(stdout)
            console.log(`[SessionManager] parsed: tasks=${schema.tasks?.length ?? 0} decisions=${schema.decisions?.length ?? 0}`)
            replaceTasksAndDecisions(
              projectId,
              claudeSessionId,
              schema.tasks ?? [],
              schema.decisions ?? []
            )
            console.log(`[SessionManager] Mind Tree updated — notifying renderer`)
            this.notifyRenderer(wsidnSessionId, projectId, claudeSessionId)
          } catch (err) {
            console.error(`[SessionManager] applyUpdate failed for ${wsidnSessionId}:`, err)
          }
        } else if (wasKilled) {
          console.log(`[SessionManager] process was killed — will requeue if pending prompts exist`)
        } else {
          console.warn(`[SessionManager] process exited with code=${code} — skipping update`)
        }

        // Re-run if new prompts arrived while we were running (or after kill)
        const newPrompts = this.pendingPrompts.get(wsidnSessionId) ?? []
        if (newPrompts.length > 0 && this.enabledSessions.has(wsidnSessionId)) {
          console.log(`[SessionManager] ${newPrompts.length} pending prompt(s) after close — re-running`)
          this.run(wsidnSessionId).then(resolve).catch(() => resolve())
        } else {
          resolve()
        }
      })

      proc.on('error', (err) => {
        console.error(`[SessionManager] spawn error for ${wsidnSessionId}:`, err)
        this.activeProcesses.delete(wsidnSessionId)
        resolve()
      })
    })
  }
}

export const sessionManager = new SessionManager()
