import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { listTodos, replaceTasksAndDecisions } from '@main/storage/todo-storage'
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
    } else {
      this.killActive(wsidnSessionId)
      this.pendingPrompts.delete(wsidnSessionId)
      this.enabledSessions.delete(wsidnSessionId)
    }
  }

  isEnabled(wsidnSessionId: string): boolean {
    return this.enabledSessions.has(wsidnSessionId)
  }

  onPromptSubmit(wsidnSessionId: string, prompt: string): void {
    if (!this.enabledSessions.has(wsidnSessionId)) return

    // Accumulate prompt
    const existing = this.pendingPrompts.get(wsidnSessionId) ?? []
    existing.push(prompt)
    this.pendingPrompts.set(wsidnSessionId, existing)

    // Kill active process — close handler will re-run with accumulated prompts
    if (this.activeProcesses.has(wsidnSessionId)) {
      this.killActive(wsidnSessionId)
      return
    }

    // No active process — start immediately
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

    const todos = listTodos(projectId, claudeSessionId)
    const tasks = todos.filter((t) => t.category === 'task' && !t.parentId)
    const decisions = todos.filter((t) => t.category === 'decision')

    const taskLines = tasks.map((t) => {
      const children = todos.filter((c) => c.parentId === t.id)
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
    if (!info?.claudeSessionId) {
      // No Claude session yet — discard pending prompts
      this.pendingPrompts.delete(wsidnSessionId)
      return
    }

    const prompts = this.pendingPrompts.get(wsidnSessionId) ?? []
    this.pendingPrompts.delete(wsidnSessionId)
    if (prompts.length === 0) return

    const { projectId, cwd, claudeSessionId } = info
    const systemPrompt = this.getSystemPrompt()
    const model = this.getModel()
    const inputText = this.buildInputText(prompts, claudeSessionId, projectId)

    // Notify renderer that processing has started
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.SESSION_MANAGER_PROCESSING, {
        wsidnSessionId,
      })
    }

    return new Promise<void>((resolve) => {
      const args = [
        '-p',
        '--output-format', 'json',
        '-m', model,
        '--system-prompt', systemPrompt,
        inputText,
      ]

      const proc = spawn('claude', args, {
        cwd,
        env: { ...process.env },
        windowsHide: true,
        shell: process.platform === 'win32',
      })

      this.activeProcesses.set(wsidnSessionId, proc)

      let stdout = ''
      let wasKilled = false

      proc.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
      })

      proc.stderr?.on('data', (chunk: Buffer) => {
        console.warn(`[SessionManager] stderr: ${chunk.toString()}`)
      })

      proc.on('close', (code, signal) => {
        this.activeProcesses.delete(wsidnSessionId)
        wasKilled = !!signal

        if (!wasKilled && code === 0) {
          try {
            const schema = this.parseOutput(stdout)
            replaceTasksAndDecisions(
              projectId,
              claudeSessionId,
              schema.tasks ?? [],
              schema.decisions ?? []
            )
            this.notifyRenderer(wsidnSessionId, projectId, claudeSessionId)
          } catch (err) {
            console.error(`[SessionManager] applyUpdate failed for ${wsidnSessionId}:`, err)
          }
        }

        // Re-run if new prompts arrived while we were running (or after kill)
        const newPrompts = this.pendingPrompts.get(wsidnSessionId) ?? []
        if (newPrompts.length > 0 && this.enabledSessions.has(wsidnSessionId)) {
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
