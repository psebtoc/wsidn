import { unwrapIpc } from '@renderer/types/ipc'

export const sessionService = {
  async create(projectId: string, cwd: string) {
    return unwrapIpc(await window.wsidn.session.create(projectId, cwd))
  },
  async close(sessionId: string) {
    return unwrapIpc(await window.wsidn.session.close(sessionId))
  },
  async list(projectId: string) {
    return unwrapIpc(await window.wsidn.session.list(projectId))
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
