import { create } from 'zustand'
import type { AppConfig } from '@renderer/types/project'
import { unwrapIpc } from '@renderer/types/ipc'

const DEFAULT_CONFIG: AppConfig = {
  theme: 'dark',
  defaultShell: '',
  terminal: {
    fontSize: 14,
    fontFamily: 'Consolas, monospace',
    cursorStyle: 'block',
    cursorBlink: true,
    scrollback: 5000,
    background: '#1a1a1a',
    foreground: '#e0e0e0',
  },
}

interface ConfigState {
  config: AppConfig
  loaded: boolean
  loadConfig: () => Promise<void>
  updateConfig: (patch: Partial<AppConfig>) => Promise<void>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  loaded: false,

  loadConfig: async () => {
    try {
      const config = unwrapIpc(await window.wsidn.config.get())
      // Merge with defaults to fill missing fields from older config files
      set({
        config: {
          ...DEFAULT_CONFIG,
          ...config,
          terminal: { ...DEFAULT_CONFIG.terminal, ...config.terminal },
        },
        loaded: true,
      })
    } catch {
      set({ loaded: true })
    }
  },

  updateConfig: async (patch) => {
    const prev = get().config
    const next = { ...prev, ...patch }
    // Write each changed key to disk
    for (const key of Object.keys(patch) as (keyof AppConfig)[]) {
      await unwrapIpc(await window.wsidn.config.set(key, patch[key]))
    }
    set({ config: next })
  },
}))
