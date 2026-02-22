import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigStore, applyTheme } from '@renderer/stores/config-store'
import type { AppConfig, TerminalConfig, TerminalColorOverride } from '@renderer/types/project'
import Modal from '@renderer/components/ui/Modal'
import Button from '@renderer/components/ui/Button'
import GeneralTab from './tabs/GeneralTab'
import TerminalTab from './tabs/TerminalTab'
import AppearanceTab from './tabs/AppearanceTab'
import KeyboardTab from './tabs/KeyboardTab'

type SettingsTab = 'general' | 'terminal' | 'appearance' | 'keyboard'

interface AppSettingsModalProps {
  open: boolean
  onClose: () => void
}

export default function AppSettingsModal({ open, onClose }: AppSettingsModalProps) {
  const { t } = useTranslation()
  const config = useConfigStore((s) => s.config)
  const updateConfig = useConfigStore((s) => s.updateConfig)

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [terminal, setTerminal] = useState<TerminalConfig>(config.terminal)
  const [defaultShell, setDefaultShell] = useState(config.defaultShell)
  const [language, setLanguage] = useState<AppConfig['language']>(config.language)
  const [theme, setTheme] = useState(config.theme)
  const [accentColor, setAccentColor] = useState<string | null>(config.accentColor)
  const [terminalColors, setTerminalColors] = useState<Record<string, TerminalColorOverride>>(config.terminalColors)
  const [shortcuts, setShortcuts] = useState<Record<string, string>>((config.shortcuts ?? {}) as Record<string, string>)
  const [saving, setSaving] = useState(false)

  // Store originals for cancel revert
  const originalThemeRef = useRef(config.theme)
  const originalAccentRef = useRef(config.accentColor)

  // Sync local state when modal opens
  useEffect(() => {
    if (open) {
      setTerminal(config.terminal)
      setDefaultShell(config.defaultShell)
      setLanguage(config.language)
      setTheme(config.theme)
      setAccentColor(config.accentColor)
      setTerminalColors(config.terminalColors)
      setShortcuts((config.shortcuts ?? {}) as Record<string, string>)
      setActiveTab('general')
      originalThemeRef.current = config.theme
      originalAccentRef.current = config.accentColor
    }
  }, [open, config])

  // Live preview: apply theme + accent immediately when selection changes
  const handleThemeChange = (themeId: string) => {
    setTheme(themeId)
    applyTheme(themeId, accentColor)
  }

  const handleAccentChange = (accentId: string | null) => {
    setAccentColor(accentId)
    applyTheme(theme, accentId)
  }

  const handleCancel = () => {
    // Revert to original theme+accent if changed during preview
    if (theme !== originalThemeRef.current || accentColor !== originalAccentRef.current) {
      applyTheme(originalThemeRef.current, originalAccentRef.current)
    }
    onClose()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch: Partial<AppConfig> = {
        defaultShell,
        language,
        accentColor,
        terminalColors,
        terminal,
        theme,
        shortcuts,
      }
      await updateConfig(patch)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const updateTerminal = (patch: Partial<TerminalConfig>) => {
    setTerminal((prev) => ({ ...prev, ...patch }))
  }

  const handleColorChange = (patch: TerminalColorOverride) => {
    setTerminalColors((prev) => ({
      ...prev,
      [theme]: { ...prev[theme], ...patch },
    }))
  }

  const handleColorReset = (key: 'background' | 'foreground') => {
    setTerminalColors((prev) => {
      const current = { ...prev[theme] }
      delete current[key]
      // If no overrides left, remove the theme entry entirely
      if (Object.keys(current).length === 0) {
        const next = { ...prev }
        delete next[theme]
        return next
      }
      return { ...prev, [theme]: current }
    })
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: t('settings.tabs.general') },
    { id: 'terminal', label: t('settings.tabs.terminal') },
    { id: 'appearance', label: t('settings.tabs.appearance') },
    { id: 'keyboard', label: t('settings.tabs.keyboard') },
  ]

  return (
    <Modal open={open} onClose={handleCancel} width="w-[540px]">
      <h2 className="text-lg font-semibold text-fg mb-4">{t('settings.title')}</h2>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm transition-colors relative ${
              activeTab === tab.id
                ? 'text-fg font-medium'
                : 'text-fg-dim hover:text-fg-secondary'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[280px]">
        {activeTab === 'general' && (
          <GeneralTab
            language={language}
            defaultShell={defaultShell}
            onLanguageChange={setLanguage}
            onShellChange={setDefaultShell}
          />
        )}
        {activeTab === 'terminal' && (
          <TerminalTab
            terminal={terminal}
            themeId={theme}
            colorOverride={terminalColors[theme]}
            onUpdate={updateTerminal}
            onColorChange={handleColorChange}
            onColorReset={handleColorReset}
          />
        )}
        {activeTab === 'appearance' && (
          <AppearanceTab
            selectedTheme={theme}
            selectedAccent={accentColor}
            onSelectTheme={handleThemeChange}
            onSelectAccent={handleAccentChange}
          />
        )}
        {activeTab === 'keyboard' && (
          <KeyboardTab
            shortcuts={shortcuts}
            onShortcutsChange={setShortcuts}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle">
        <Button variant="ghost" size="md" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="md" loading={saving} disabled={saving} onClick={handleSave}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}
