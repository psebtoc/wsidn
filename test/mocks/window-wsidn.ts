import { vi } from 'vitest'

/**
 * Creates a complete mock of window.wsidn API for renderer tests.
 * All methods return vi.fn() stubs that can be configured per test.
 */
export function createWindowWsidnMock() {
  const mock = {
    project: {
      create: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      selectDir: vi.fn(),
    },
    session: {
      close: vi.fn(),
      spawn: vi.fn(),
    },
    resumeHistory: {
      list: vi.fn(),
      append: vi.fn(),
      appendSync: vi.fn(),
    },
    config: {
      get: vi.fn(),
      set: vi.fn(),
    },
    terminal: {
      input: vi.fn(),
      resize: vi.fn(),
      onOutput: vi.fn(() => vi.fn()),
      onExit: vi.fn(() => vi.fn()),
    },
    mindtree: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      copy: vi.fn(),
    },
    template: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workspace: {
      load: vi.fn(),
      save: vi.fn(),
    },
    claude: {
      onSessionEvent: vi.fn(() => vi.fn()),
    },
    sessionManager: {
      setEnabled: vi.fn(),
      getStatus: vi.fn(),
      onUpdated: vi.fn(() => vi.fn()),
      onProcessing: vi.fn(() => vi.fn()),
    },
    window: {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
    },
  }

  return mock
}

/**
 * Installs the mock on the global window object.
 * Call in beforeEach.
 */
export function installWindowWsidnMock() {
  const mock = createWindowWsidnMock()
  globalThis.window = globalThis.window || ({} as Window & typeof globalThis)
  ;(globalThis.window as unknown as Record<string, unknown>).wsidn = mock
  return mock
}
