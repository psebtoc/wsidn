import { vi } from 'vitest'
import type { IpcResult } from '@renderer/types/ipc'

/** Creates a vi.fn() that resolves with { success: true, data: defaultData } */
function ipc<T>(defaultData: T) {
  return vi.fn().mockResolvedValue({ success: true, data: defaultData } as IpcResult<T>)
}

/** Creates a vi.fn() that returns an unsubscribe fn */
function listener() {
  return vi.fn().mockReturnValue(vi.fn())
}

export function createWsidnMock() {
  const mock = {
    project: {
      create: ipc(null as never),
      list: ipc([] as never[]),
      delete: ipc(true),
      update: ipc(null as never),
      selectDir: ipc(null as string | null),
    },
    session: {
      close: ipc(true),
      spawn: ipc(true),
    },
    resumeHistory: {
      list: ipc([] as never[]),
      append: ipc(true),
      appendSync: vi.fn().mockReturnValue(true),
    },
    config: {
      get: ipc(null as never),
      set: ipc(true),
    },
    terminal: {
      input: vi.fn(),
      resize: vi.fn(),
      onOutput: listener(),
      onExit: listener(),
    },
    mindtree: {
      list: ipc([] as never[]),
      create: ipc(null as never),
      update: ipc(null as never),
      delete: ipc(true),
      copy: ipc(true),
    },
    template: {
      list: ipc([] as never[]),
      create: ipc(null as never),
      update: ipc(null as never),
      delete: ipc(true),
    },
    workspace: {
      load: ipc(null as never),
      save: ipc(true),
    },
    claude: {
      onSessionEvent: listener(),
    },
    sessionManager: {
      setEnabled: ipc(true),
      getStatus: ipc({ enabled: false }),
      onUpdated: listener(),
      onProcessing: listener(),
    },
    shell: {
      openExternal: vi.fn().mockResolvedValue(undefined),
      openPath: vi.fn().mockResolvedValue(undefined),
    },
    window: {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
    },

    /**
     * Reset all mocks and re-apply default return values.
     * Call in beforeEach to ensure clean state between tests.
     */
    reset() {
      vi.clearAllMocks()
      // Re-apply default implementations after clearAllMocks wipes them
      mock.project.create.mockResolvedValue({ success: true, data: null })
      mock.project.list.mockResolvedValue({ success: true, data: [] })
      mock.project.delete.mockResolvedValue({ success: true, data: true })
      mock.project.update.mockResolvedValue({ success: true, data: null })
      mock.project.selectDir.mockResolvedValue({ success: true, data: null })

      mock.session.close.mockResolvedValue({ success: true, data: true })
      mock.session.spawn.mockResolvedValue({ success: true, data: true })

      mock.resumeHistory.list.mockResolvedValue({ success: true, data: [] })
      mock.resumeHistory.append.mockResolvedValue({ success: true, data: true })
      mock.resumeHistory.appendSync.mockReturnValue(true)

      mock.config.get.mockResolvedValue({ success: true, data: null })
      mock.config.set.mockResolvedValue({ success: true, data: true })

      mock.terminal.onOutput.mockReturnValue(vi.fn())
      mock.terminal.onExit.mockReturnValue(vi.fn())

      mock.mindtree.list.mockResolvedValue({ success: true, data: [] })
      mock.mindtree.create.mockResolvedValue({ success: true, data: null })
      mock.mindtree.update.mockResolvedValue({ success: true, data: null })
      mock.mindtree.delete.mockResolvedValue({ success: true, data: true })
      mock.mindtree.copy.mockResolvedValue({ success: true, data: true })

      mock.template.list.mockResolvedValue({ success: true, data: [] })
      mock.template.create.mockResolvedValue({ success: true, data: null })
      mock.template.update.mockResolvedValue({ success: true, data: null })
      mock.template.delete.mockResolvedValue({ success: true, data: true })

      mock.workspace.load.mockResolvedValue({ success: true, data: null })
      mock.workspace.save.mockResolvedValue({ success: true, data: true })

      mock.claude.onSessionEvent.mockReturnValue(vi.fn())

      mock.sessionManager.setEnabled.mockResolvedValue({ success: true, data: true })
      mock.sessionManager.getStatus.mockResolvedValue({ success: true, data: { enabled: false } })
      mock.sessionManager.onUpdated.mockReturnValue(vi.fn())
      mock.sessionManager.onProcessing.mockReturnValue(vi.fn())
    },
  }

  return mock
}

export type WsidnMock = ReturnType<typeof createWsidnMock>
