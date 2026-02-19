import { ipcMain } from 'electron'
import { existsSync, readdirSync } from 'fs'
import { v4 as uuid } from 'uuid'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { getAppDataPath, readJson, writeJson } from '@main/storage/storage-manager'
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
          claudeModel: null
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
