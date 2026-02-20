import { create } from 'zustand'
import type { AppConfig } from '@renderer/types/project'
import { unwrapIpc } from '@renderer/types/ipc'
import { getThemePreset } from '@renderer/themes/theme-presets'
import i18n from '@renderer/i18n'

const DEFAULT_CONFIG: AppConfig = {
  theme: 'default-dark',
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
  language: 'ko',
}

function applyTheme(themeId: string): void {
  document.documentElement.setAttribute('data-theme', themeId)
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
      // Migrate old theme values
      if (config.theme === 'dark' || config.theme === 'light') {
        config.theme = 'default-dark'
      }
      // Merge with defaults to fill missing fields from older config files
      const merged = {
        ...DEFAULT_CONFIG,
        ...config,
        terminal: { ...DEFAULT_CONFIG.terminal, ...config.terminal },
      }
      set({ config: merged, loaded: true })
      applyTheme(merged.theme)
      if (merged.language && merged.language !== i18n.language) {
        i18n.changeLanguage(merged.language)
      }
    } catch {
      set({ loaded: true })
      applyTheme(DEFAULT_CONFIG.theme)
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
    if (patch.theme && patch.theme !== prev.theme) {
      applyTheme(patch.theme)
    }
    if (patch.language && patch.language !== i18n.language) {
      i18n.changeLanguage(patch.language)
    }
  },
}))

export { applyTheme, getThemePreset }
