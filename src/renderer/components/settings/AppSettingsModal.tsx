import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigStore } from '@renderer/stores/config-store'
import type { AppConfig, TerminalConfig } from '@renderer/types/project'
import Radio from '@renderer/components/ui/Radio'
import Checkbox from '@renderer/components/ui/Checkbox'

interface AppSettingsModalProps {
  open: boolean
  onClose: () => void
}

export default function AppSettingsModal({ open, onClose }: AppSettingsModalProps) {
  const { t } = useTranslation()
  const config = useConfigStore((s) => s.config)
  const updateConfig = useConfigStore((s) => s.updateConfig)

  const [terminal, setTerminal] = useState<TerminalConfig>(config.terminal)
  const [defaultShell, setDefaultShell] = useState(config.defaultShell)
  const [language, setLanguage] = useState<AppConfig['language']>(config.language)
  const [saving, setSaving] = useState(false)

  // Sync local state when modal opens
  useEffect(() => {
    if (open) {
      setTerminal(config.terminal)
      setDefaultShell(config.defaultShell)
      setLanguage(config.language)
    }
  }, [open, config])

  if (!open) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateConfig({ terminal, defaultShell, language })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const updateTerminal = (patch: Partial<TerminalConfig>) => {
    setTerminal((prev) => ({ ...prev, ...patch }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-neutral-800 rounded-lg border border-neutral-700 p-6 w-[480px] shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-5">{t('settings.title')}</h2>

        {/* Terminal Section */}
        <div className="mb-5">
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
            {t('settings.terminal')}
          </h3>
          <div className="space-y-3">
            {/* Font Size */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-300">{t('settings.fontSize')}</label>
              <input
                type="number"
                min={8}
                max={32}
                value={terminal.fontSize}
                onChange={(e) => updateTerminal({ fontSize: Number(e.target.value) || 14 })}
                className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                           text-center focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Font Family */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-300">{t('settings.fontFamily')}</label>
              <input
                type="text"
                value={terminal.fontFamily}
                onChange={(e) => updateTerminal({ fontFamily: e.target.value })}
                className="w-48 px-2 py-1 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                           focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Cursor Style */}
            <div>
              <label className="text-sm text-neutral-300 block mb-2">{t('settings.cursorStyle')}</label>
              <div className="flex gap-4 ml-1">
                {(['block', 'underline', 'bar'] as const).map((style) => (
                  <label key={style} className="flex items-center gap-1.5 cursor-pointer">
                    <Radio
                      checked={terminal.cursorStyle === style}
                      onChange={() => updateTerminal({ cursorStyle: style })}
                    />
                    <span className="text-sm text-neutral-300 capitalize">{style}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cursor Blink */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-300">{t('settings.cursorBlink')}</label>
              <Checkbox
                state={terminal.cursorBlink ? 'checked' : 'unchecked'}
                onChange={() => updateTerminal({ cursorBlink: !terminal.cursorBlink })}
              />
            </div>

            {/* Scrollback */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-300">{t('settings.scrollbackLines')}</label>
              <input
                type="number"
                min={500}
                max={50000}
                step={500}
                value={terminal.scrollback}
                onChange={(e) => updateTerminal({ scrollback: Number(e.target.value) || 5000 })}
                className="w-24 px-2 py-1 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                           text-center focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Colors */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-300">{t('settings.background')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={terminal.background}
                  onChange={(e) => updateTerminal({ background: e.target.value })}
                  className="w-8 h-6 rounded border border-neutral-600 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-neutral-500 font-mono">{terminal.background}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-300">{t('settings.foreground')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={terminal.foreground}
                  onChange={(e) => updateTerminal({ foreground: e.target.value })}
                  className="w-8 h-6 rounded border border-neutral-600 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-neutral-500 font-mono">{terminal.foreground}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shell Section */}
        <div className="mb-5">
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
            {t('settings.shell')}
          </h3>
          <div>
            <label className="text-sm text-neutral-300 block mb-1">{t('settings.defaultShell')}</label>
            <input
              type="text"
              value={defaultShell}
              onChange={(e) => setDefaultShell(e.target.value)}
              placeholder={t('settings.shellPlaceholder')}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                         placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {t('settings.shellDescription')}
            </p>
          </div>
        </div>

        {/* Language Section */}
        <div className="mb-5">
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
            {t('settings.language')}
          </h3>
          <div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as AppConfig['language'])}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                         focus:outline-none focus:border-blue-500"
            >
              {(['ko', 'en'] as const).map((lang) => (
                <option key={lang} value={lang}>
                  {t(`settings.lang.${lang}`)}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              {t('settings.languageDescription')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-600 disabled:text-neutral-400
                       rounded text-sm text-white font-medium transition-colors"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
