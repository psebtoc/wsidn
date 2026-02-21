import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { sessionManager } from './session-manager'

export function registerSessionManagerIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.SESSION_MANAGER_SET_ENABLED,
    (
      _event,
      {
        wsidnSessionId,
        enabled,
        projectId,
        cwd,
        claudeSessionId,
      }: {
        wsidnSessionId: string
        enabled: boolean
        projectId?: string
        cwd?: string
        claudeSessionId?: string | null
      }
    ) => {
      try {
        sessionManager.setEnabled(
          wsidnSessionId,
          enabled,
          projectId && cwd !== undefined
            ? { projectId, cwd, claudeSessionId: claudeSessionId ?? null }
            : undefined
        )
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SESSION_MANAGER_GET_STATUS,
    (_event, { wsidnSessionId }: { wsidnSessionId: string }) => {
      try {
        return { success: true, data: { enabled: sessionManager.isEnabled(wsidnSessionId) } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
