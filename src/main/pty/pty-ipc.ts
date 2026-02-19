import { ipcMain } from 'electron'
import { existsSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
import { join, basename } from 'path'
import { v4 as uuid } from 'uuid'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { getAppDataPath, readJson, writeJson } from '@main/storage/storage-manager'
import { listProjects, getProject } from '@main/storage/project-storage'
import { ptyManager } from './pty-manager'

interface Session {
  id: string
  projectId: string
  name: string
  cwd: string
  status: 'active' | 'closed'
  createdAt: string
  claudeSessionId: string | null
  claudeModel: string | null
  claudeLastTitle: string | null
  lastClaudeSessionId: string | null
}

function sessionsPath(projectId: string): string {
  return getAppDataPath('projects', projectId, 'sessions.json')
}

export function registerPtyIpc(): void {
  // --- request-response handlers (invoke/handle) ---

  ipcMain.handle(
    IPC_CHANNELS.SESSION_CREATE,
    (_event, { projectId, cwd }: { projectId: string; cwd: string }) => {
      try {
        const filePath = sessionsPath(projectId)
        const sessions = readJson<Session[]>(filePath, [])

        const session: Session = {
          id: uuid(),
          projectId,
          name: `Session ${sessions.length + 1}`,
          cwd,
          status: 'active',
          createdAt: new Date().toISOString(),
          claudeSessionId: null,
          claudeModel: null,
          claudeLastTitle: null,
          lastClaudeSessionId: null
        }

        sessions.push(session)
        writeJson(filePath, sessions)
        ptyManager.spawn(session.id, cwd)
        return { success: true, data: session }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SESSION_CLOSE,
    (_event, { sessionId }: { sessionId: string }) => {
      try {
        ptyManager.kill(sessionId)

        // Update session status in sessions.json
        // Scan all project directories to find the session
        const projectsDir = getAppDataPath('projects')
        if (existsSync(projectsDir)) {
          for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue
            const filePath = getAppDataPath('projects', entry.name, 'sessions.json')
            const sessions = readJson<Session[]>(filePath, [])
            const session = sessions.find((s) => s.id === sessionId)
            if (session) {
              session.status = 'closed'
              writeJson(filePath, sessions)
              break
            }
          }
        }

        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SESSION_LIST,
    (_event, { projectId }: { projectId: string }) => {
      try {
        const filePath = sessionsPath(projectId)
        const sessions = readJson<Session[]>(filePath, [])
        return { success: true, data: sessions }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.SESSION_LIST_ALL, () => {
    try {
      const projects = listProjects()
      const result: { project: { id: string; name: string }; sessions: Session[] }[] = []

      for (const project of projects) {
        const filePath = sessionsPath(project.id)
        const sessions = readJson<Session[]>(filePath, [])
        const activeSessions = sessions.filter((s) => s.status === 'active')
        if (activeSessions.length > 0) {
          result.push({
            project: { id: project.id, name: project.name },
            sessions: activeSessions,
          })
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SESSION_UPDATE_TITLE,
    (_event, { sessionId, title }: { sessionId: string; title: string }) => {
      try {
        const projectsDir = getAppDataPath('projects')
        if (existsSync(projectsDir)) {
          for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue
            const filePath = getAppDataPath('projects', entry.name, 'sessions.json')
            const sessions = readJson<Session[]>(filePath, [])
            const session = sessions.find((s) => s.id === sessionId)
            if (session) {
              session.claudeLastTitle = title
              writeJson(filePath, sessions)
              break
            }
          }
        }
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SESSION_CREATE_WORKTREE,
    (
      _event,
      { projectId, cwd, branchName }: { projectId: string; cwd: string; branchName: string }
    ) => {
      try {
        const parentDir = join(cwd, '..')
        const projectDirName = basename(cwd)
        const worktreePath = join(parentDir, `${projectDirName}-${branchName}`)

        execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, { cwd })

        const filePath = sessionsPath(projectId)
        const sessions = readJson<Session[]>(filePath, [])

        const session: Session = {
          id: uuid(),
          projectId,
          name: `WT: ${branchName}`,
          cwd: worktreePath,
          status: 'active',
          createdAt: new Date().toISOString(),
          claudeSessionId: null,
          claudeModel: null,
          claudeLastTitle: null,
          lastClaudeSessionId: null
        }

        sessions.push(session)
        writeJson(filePath, sessions)
        ptyManager.spawn(session.id, worktreePath)

        // Read project's worktreeInitScript
        const project = getProject(projectId)
        const initScript = project?.worktreeInitScript ?? null

        return { success: true, data: { session, worktreePath, initScript } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // --- Session spawn (PTY only, no record creation) ---

  ipcMain.handle(
    IPC_CHANNELS.SESSION_SPAWN,
    (_event, { sessionId, cwd }: { sessionId: string; cwd: string }) => {
      try {
        ptyManager.spawn(sessionId, cwd)
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // --- Clear stale Claude bindings (app startup) ---

  ipcMain.handle(
    IPC_CHANNELS.SESSION_CLEAR_STALE,
    (_event, { projectId }: { projectId: string }) => {
      try {
        const filePath = sessionsPath(projectId)
        const sessions = readJson<Session[]>(filePath, [])
        let changed = false
        for (const session of sessions) {
          if (session.status === 'active' && session.claudeSessionId) {
            session.lastClaudeSessionId = session.lastClaudeSessionId ?? session.claudeSessionId
            session.claudeSessionId = null
            session.claudeModel = null
            changed = true
          }
        }
        if (changed) writeJson(filePath, sessions)
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // --- Session rename ---

  ipcMain.handle(
    IPC_CHANNELS.SESSION_RENAME,
    (_event, { sessionId, name }: { sessionId: string; name: string }) => {
      try {
        const projectsDir = getAppDataPath('projects')
        if (existsSync(projectsDir)) {
          for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue
            const filePath = getAppDataPath('projects', entry.name, 'sessions.json')
            const sessions = readJson<Session[]>(filePath, [])
            const session = sessions.find((s) => s.id === sessionId)
            if (session) {
              session.name = name.trim() || session.name
              writeJson(filePath, sessions)
              return { success: true, data: true }
            }
          }
        }
        return { success: false, error: 'Session not found' }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // --- Workspace persistence ---

  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_LOAD,
    (_event, { projectId }: { projectId: string }) => {
      try {
        const filePath = getAppDataPath('projects', projectId, 'workspace.json')
        const data = readJson<unknown>(filePath, null as unknown as never)
        return { success: true, data: data ?? null }
      } catch {
        return { success: true, data: null }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_SAVE,
    (_event, { projectId, workspace }: { projectId: string; workspace: unknown }) => {
      try {
        const filePath = getAppDataPath('projects', projectId, 'workspace.json')
        writeJson(filePath, workspace)
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // --- one-way event handlers (send/on) ---

  ipcMain.on(
    IPC_CHANNELS.PTY_INPUT,
    (_event, { sessionId, data }: { sessionId: string; data: string }) => {
      ptyManager.write(sessionId, data)
    }
  )

  ipcMain.on(
    IPC_CHANNELS.PTY_RESIZE,
    (_event, { sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }) => {
      ptyManager.resize(sessionId, cols, rows)
    }
  )
}
