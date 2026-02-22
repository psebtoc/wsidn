import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWsidnMock } from '../../../test/mocks/wsidn-api'

const wsidnMock = createWsidnMock()
// Set up window.wsidn at module level (compatible with both Node and jsdom)
Object.defineProperty(globalThis, 'window', {
  value: { ...(globalThis as Record<string, unknown>)['window'], wsidn: wsidnMock },
  writable: true,
  configurable: true,
})

beforeEach(() => {
  wsidnMock.reset()
})

import { sessionService } from './session-service'

describe('session-service', () => {
  describe('spawn', () => {
    it('calls window.wsidn.session.spawn with sessionId and cwd', async () => {
      await sessionService.spawn('sess-1', '/code')

      expect(wsidnMock.session.spawn).toHaveBeenCalledWith('sess-1', '/code')
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.session.spawn.mockResolvedValue({ success: false, error: 'spawn failed' })

      await expect(sessionService.spawn('sess-1', '/code')).rejects.toThrow('spawn failed')
    })
  })

  describe('close', () => {
    it('calls window.wsidn.session.close with sessionId', async () => {
      await sessionService.close('sess-1')

      expect(wsidnMock.session.close).toHaveBeenCalledWith('sess-1')
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.session.close.mockResolvedValue({ success: false, error: 'close failed' })

      await expect(sessionService.close('sess-1')).rejects.toThrow('close failed')
    })
  })

  describe('listResumeHistory', () => {
    it('calls window.wsidn.resumeHistory.list with projectId', async () => {
      const entries = [
        {
          claudeSessionId: 'claude-1',
          sessionName: 'My Session',
          claudeLastTitle: 'Task title',
          closedAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      wsidnMock.resumeHistory.list.mockResolvedValue({ success: true, data: entries })

      const result = await sessionService.listResumeHistory('proj-1')

      expect(wsidnMock.resumeHistory.list).toHaveBeenCalledWith('proj-1')
      expect(result).toEqual(entries)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.resumeHistory.list.mockResolvedValue({ success: false, error: 'list failed' })

      await expect(sessionService.listResumeHistory('proj-1')).rejects.toThrow('list failed')
    })
  })

  describe('appendResumeHistory', () => {
    it('calls window.wsidn.resumeHistory.append with projectId and entry', async () => {
      const entry = {
        claudeSessionId: 'claude-1',
        sessionName: 'My Session',
        claudeLastTitle: 'Task',
        closedAt: '2024-01-01T00:00:00.000Z',
      }
      await sessionService.appendResumeHistory('proj-1', entry)

      expect(wsidnMock.resumeHistory.append).toHaveBeenCalledWith('proj-1', entry)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.resumeHistory.append.mockResolvedValue({ success: false, error: 'append failed' })

      await expect(
        sessionService.appendResumeHistory('proj-1', {
          claudeSessionId: 'c1',
          sessionName: 'S',
          claudeLastTitle: null,
          closedAt: '2024-01-01T00:00:00.000Z',
        })
      ).rejects.toThrow('append failed')
    })
  })

  describe('loadWorkspace', () => {
    it('calls window.wsidn.workspace.load with projectId', async () => {
      wsidnMock.workspace.load.mockResolvedValue({ success: true, data: null })

      const result = await sessionService.loadWorkspace('proj-1')

      expect(wsidnMock.workspace.load).toHaveBeenCalledWith('proj-1')
      expect(result).toBeNull()
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.workspace.load.mockResolvedValue({ success: false, error: 'load failed' })

      await expect(sessionService.loadWorkspace('proj-1')).rejects.toThrow('load failed')
    })
  })

  describe('saveWorkspace', () => {
    it('calls window.wsidn.workspace.save with projectId and workspace', async () => {
      const workspace = {
        version: 2 as const,
        panes: [],
        splitLayout: null,
        focusedPaneId: null,
        minimizedPaneIds: [],
      }
      await sessionService.saveWorkspace('proj-1', workspace)

      expect(wsidnMock.workspace.save).toHaveBeenCalledWith('proj-1', workspace)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.workspace.save.mockResolvedValue({ success: false, error: 'save failed' })

      await expect(
        sessionService.saveWorkspace('proj-1', {
          version: 2,
          panes: [],
          splitLayout: null,
          focusedPaneId: null,
          minimizedPaneIds: [],
        })
      ).rejects.toThrow('save failed')
    })
  })

  describe('terminalInput', () => {
    it('calls window.wsidn.terminal.input with sessionId and data', () => {
      sessionService.terminalInput('sess-1', 'ls\n')

      expect(wsidnMock.terminal.input).toHaveBeenCalledWith('sess-1', 'ls\n')
    })
  })

  describe('terminalResize', () => {
    it('calls window.wsidn.terminal.resize with sessionId, cols, rows', () => {
      sessionService.terminalResize('sess-1', 80, 24)

      expect(wsidnMock.terminal.resize).toHaveBeenCalledWith('sess-1', 80, 24)
    })
  })

  describe('onTerminalOutput', () => {
    it('calls window.wsidn.terminal.onOutput and returns unsubscribe fn', () => {
      const unsub = vi.fn()
      wsidnMock.terminal.onOutput.mockReturnValue(unsub)

      const cb = vi.fn()
      const result = sessionService.onTerminalOutput(cb)

      expect(wsidnMock.terminal.onOutput).toHaveBeenCalledWith(cb)
      expect(result).toBe(unsub)
    })
  })

  describe('onTerminalExit', () => {
    it('calls window.wsidn.terminal.onExit and returns unsubscribe fn', () => {
      const unsub = vi.fn()
      wsidnMock.terminal.onExit.mockReturnValue(unsub)

      const cb = vi.fn()
      const result = sessionService.onTerminalExit(cb)

      expect(wsidnMock.terminal.onExit).toHaveBeenCalledWith(cb)
      expect(result).toBe(unsub)
    })
  })

  describe('sessionManagerSetEnabled', () => {
    it('calls window.wsidn.sessionManager.setEnabled with all args', async () => {
      const info = { projectId: 'proj-1', cwd: '/code', claudeSessionId: 'claude-1' }
      await sessionService.sessionManagerSetEnabled('sess-1', true, info)

      expect(wsidnMock.sessionManager.setEnabled).toHaveBeenCalledWith('sess-1', true, info)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.sessionManager.setEnabled.mockResolvedValue({ success: false, error: 'set failed' })

      await expect(sessionService.sessionManagerSetEnabled('sess-1', true)).rejects.toThrow(
        'set failed'
      )
    })
  })

  describe('sessionManagerGetStatus', () => {
    it('calls window.wsidn.sessionManager.getStatus', async () => {
      wsidnMock.sessionManager.getStatus.mockResolvedValue({ success: true, data: { enabled: true } })

      const result = await sessionService.sessionManagerGetStatus('sess-1')

      expect(wsidnMock.sessionManager.getStatus).toHaveBeenCalledWith('sess-1')
      expect(result).toEqual({ enabled: true })
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.sessionManager.getStatus.mockResolvedValue({ success: false, error: 'get failed' })

      await expect(sessionService.sessionManagerGetStatus('sess-1')).rejects.toThrow('get failed')
    })
  })

  describe('onSessionManagerUpdated', () => {
    it('calls window.wsidn.sessionManager.onUpdated and returns unsubscribe fn', () => {
      const unsub = vi.fn()
      wsidnMock.sessionManager.onUpdated.mockReturnValue(unsub)

      const cb = vi.fn()
      const result = sessionService.onSessionManagerUpdated(cb)

      expect(wsidnMock.sessionManager.onUpdated).toHaveBeenCalledWith(cb)
      expect(result).toBe(unsub)
    })
  })

  describe('onSessionManagerProcessing', () => {
    it('calls window.wsidn.sessionManager.onProcessing and returns unsubscribe fn', () => {
      const unsub = vi.fn()
      wsidnMock.sessionManager.onProcessing.mockReturnValue(unsub)

      const cb = vi.fn()
      const result = sessionService.onSessionManagerProcessing(cb)

      expect(wsidnMock.sessionManager.onProcessing).toHaveBeenCalledWith(cb)
      expect(result).toBe(unsub)
    })
  })
})
