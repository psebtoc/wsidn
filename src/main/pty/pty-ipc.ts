import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { getAppDataPath, readJson, writeJson } from '@main/storage/storage-manager'
import { readResumeHistory, appendResumeHistory } from '@main/storage/resume-history'
import { ptyManager } from './pty-manager'

export function registerPtyIpc(): void {
  // --- Session close (PTY kill only) ---

  ipcMain.handle(
    IPC_CHANNELS.SESSION_CLOSE,
    (_event, { sessionId }: { sessionId: string }) => {
      try {
        ptyManager.kill(sessionId)
        return { success: true, data: true }
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

  // --- Resume history ---

  ipcMain.handle(
    IPC_CHANNELS.RESUME_HISTORY_LIST,
    (_event, { projectId }: { projectId: string }) => {
      try {
        const entries = readResumeHistory(projectId)
        return { success: true, data: entries }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.RESUME_HISTORY_APPEND,
    (
      _event,
      {
        projectId,
        entry
      }: {
        projectId: string
        entry: {
          claudeSessionId: string
          sessionName: string
          claudeLastTitle: string | null
          closedAt: string
        }
      }
    ) => {
      try {
        appendResumeHistory(projectId, entry)
        return { success: true, data: true }
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

  // --- Sync resume history append (for beforeunload) ---

  ipcMain.on(
    IPC_CHANNELS.RESUME_HISTORY_APPEND_SYNC,
    (
      event,
      {
        projectId,
        entry
      }: {
        projectId: string
        entry: {
          claudeSessionId: string
          sessionName: string
          claudeLastTitle: string | null
          closedAt: string
        }
      }
    ) => {
      try {
        appendResumeHistory(projectId, entry)
        event.returnValue = true
      } catch {
        event.returnValue = false
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
