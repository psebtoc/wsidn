import { create } from 'zustand'
import type { AppConfig } from '@renderer/types/project'
import { unwrapIpc } from '@renderer/types/ipc'
import { getThemePreset, getAccentColor, hexToRgb } from '@renderer/themes/theme-presets'
import i18n from '@renderer/i18n'
import { updateShortcutRegistry } from '@renderer/utils/shortcut-registry'

const DEFAULT_CONFIG: AppConfig = {
  theme: 'default-dark',
  accentColor: null,
  terminalColors: {},
  defaultShell: '',
  terminal: {
    fontSize: 14,
    fontFamily: 'Consolas, monospace',
    cursorStyle: 'block',
    cursorBlink: true,
    scrollback: 5000,
  },
  language: 'ko',
  sessionManager: {
    model: 'haiku',
  },
  shortcuts: {},
}

function applyTheme(themeId: string, accentColorId?: string | null): void {
  document.documentElement.setAttribute('data-theme', themeId)
  const root = document.documentElement
  const accent = accentColorId ? getAccentColor(accentColorId) : undefined
  if (accent) {
    const hoverHex = accent.hoverDark
    root.style.setProperty('--color-accent', hexToRgb(accent.value))
    root.style.setProperty('--color-accent-hover', hexToRgb(hoverHex))
  } else {
    root.style.removeProperty('--color-accent')
    root.style.removeProperty('--color-accent-hover')
  }
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
        sessionManager: { ...DEFAULT_CONFIG.sessionManager, ...config.sessionManager },
        shortcuts: { ...DEFAULT_CONFIG.shortcuts, ...config.shortcuts },
      }
      set({ config: merged, loaded: true })
      applyTheme(merged.theme, merged.accentColor)
      if (merged.language && merged.language !== i18n.language) {
        i18n.changeLanguage(merged.language)
      }
      if (merged.shortcuts) {
        updateShortcutRegistry(merged.shortcuts as Record<string, string>)
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
    if (patch.theme || 'accentColor' in patch) {
      applyTheme(next.theme, next.accentColor)
    }
    if (patch.language && patch.language !== i18n.language) {
      i18n.changeLanguage(patch.language)
    }
    if (patch.shortcuts) {
      updateShortcutRegistry(patch.shortcuts as Record<string, string>)
    }
  },
}))

export { applyTheme, getThemePreset, getAccentColor }
