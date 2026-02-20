import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigStore } from '@renderer/stores/config-store'
import type { AppConfig, TerminalConfig } from '@renderer/types/project'
import Radio from '@renderer/components/ui/Radio'
import Checkbox from '@renderer/components/ui/Checkbox'
import Modal from '@renderer/components/ui/Modal'
import Select from '@renderer/components/ui/Select'
import TextInput from '@renderer/components/ui/TextInput'
import Button from '@renderer/components/ui/Button'

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

  return (
    <Modal open={open} onClose={onClose}>
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
                         text-center focus:outline-none focus:border-primary"
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
                         focus:outline-none focus:border-primary"
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
                         text-center focus:outline-none focus:border-primary"
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
          <TextInput
            fullWidth
            value={defaultShell}
            onChange={(e) => setDefaultShell(e.target.value)}
            placeholder={t('settings.shellPlaceholder')}
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
          <Select
            fullWidth
            value={language}
            onChange={(e) => setLanguage(e.target.value as AppConfig['language'])}
          >
            {(['ko', 'en'] as const).map((lang) => (
              <option key={lang} value={lang}>
                {t(`settings.lang.${lang}`)}
              </option>
            ))}
          </Select>
          <p className="text-xs text-neutral-500 mt-1">
            {t('settings.languageDescription')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-neutral-700">
        <Button variant="ghost" size="md" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="md" loading={saving} disabled={saving} onClick={handleSave}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}
