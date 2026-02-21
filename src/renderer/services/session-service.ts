import { unwrapIpc } from '@renderer/types/ipc'
import type { ResumeHistoryEntry, WorkspaceState } from '@renderer/types/project'

export const sessionService = {
  async close(sessionId: string) {
    return unwrapIpc(await window.wsidn.session.close(sessionId))
  },
  async sessionManagerSetEnabled(
    wsidnSessionId: string,
    enabled: boolean,
    info?: { projectId: string; cwd: string; claudeSessionId: string | null }
  ) {
    return unwrapIpc(await window.wsidn.sessionManager.setEnabled(wsidnSessionId, enabled, info))
  },
  async sessionManagerGetStatus(wsidnSessionId: string) {
    return unwrapIpc(await window.wsidn.sessionManager.getStatus(wsidnSessionId))
  },
  onSessionManagerUpdated(
    cb: (payload: { wsidnSessionId: string; projectId: string; claudeSessionId: string }) => void
  ) {
    return window.wsidn.sessionManager.onUpdated(cb)
  },
  onSessionManagerProcessing(cb: (payload: { wsidnSessionId: string }) => void) {
    return window.wsidn.sessionManager.onProcessing(cb)
  },
  async spawn(sessionId: string, cwd: string) {
    return unwrapIpc(await window.wsidn.session.spawn(sessionId, cwd))
  },
  async listResumeHistory(projectId: string): Promise<ResumeHistoryEntry[]> {
    return unwrapIpc(await window.wsidn.resumeHistory.list(projectId))
  },
  async appendResumeHistory(
    projectId: string,
    entry: {
      claudeSessionId: string
      sessionName: string
      claudeLastTitle: string | null
      closedAt: string
    }
  ) {
    return unwrapIpc(await window.wsidn.resumeHistory.append(projectId, entry))
  },
  async loadWorkspace(projectId: string): Promise<WorkspaceState | null> {
    return unwrapIpc(await window.wsidn.workspace.load(projectId))
  },
  async saveWorkspace(projectId: string, workspace: WorkspaceState) {
    return unwrapIpc(await window.wsidn.workspace.save(projectId, workspace))
  },
  terminalInput(sessionId: string, data: string) {
    window.wsidn.terminal.input(sessionId, data)
  },
  terminalResize(sessionId: string, cols: number, rows: number) {
    window.wsidn.terminal.resize(sessionId, cols, rows)
  },
  onTerminalOutput(cb: (sessionId: string, data: string) => void) {
    return window.wsidn.terminal.onOutput(cb)
  },
  onTerminalExit(cb: (sessionId: string, exitCode: number) => void) {
    return window.wsidn.terminal.onExit(cb)
  }
}
