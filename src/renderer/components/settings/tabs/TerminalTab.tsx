import { useTranslation } from 'react-i18next'
import type { TerminalConfig } from '@renderer/types/project'
import { getThemePreset } from '@renderer/themes/theme-presets'
import Radio from '@renderer/components/ui/Radio'
import Checkbox from '@renderer/components/ui/Checkbox'
import Button from '@renderer/components/ui/Button'

interface TerminalTabProps {
  terminal: TerminalConfig
  themeId: string
  onUpdate: (patch: Partial<TerminalConfig>) => void
}

export default function TerminalTab({ terminal, themeId, onUpdate }: TerminalTabProps) {
  const { t } = useTranslation()

  const handleResetToThemeDefault = () => {
    const preset = getThemePreset(themeId)
    onUpdate({
      background: preset.colors.terminalBg,
      foreground: preset.colors.terminalFg,
    })
  }

  return (
    <div className="space-y-3">
      {/* Font Size */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-fg-secondary">{t('settings.fontSize')}</label>
        <input
          type="number"
          min={8}
          max={32}
          value={terminal.fontSize}
          onChange={(e) => onUpdate({ fontSize: Number(e.target.value) || 14 })}
          className="w-20 px-2 py-1 bg-surface border border-border-input rounded text-fg text-sm
                     text-center focus:outline-none focus:border-primary"
        />
      </div>

      {/* Font Family */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-fg-secondary">{t('settings.fontFamily')}</label>
        <input
          type="text"
          value={terminal.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="w-48 px-2 py-1 bg-surface border border-border-input rounded text-fg text-sm
                     focus:outline-none focus:border-primary"
        />
      </div>

      {/* Cursor Style */}
      <div>
        <label className="text-sm text-fg-secondary block mb-2">{t('settings.cursorStyle')}</label>
        <div className="flex gap-4 ml-1">
          {(['block', 'underline', 'bar'] as const).map((style) => (
            <label key={style} className="flex items-center gap-1.5 cursor-pointer">
              <Radio
                checked={terminal.cursorStyle === style}
                onChange={() => onUpdate({ cursorStyle: style })}
              />
              <span className="text-sm text-fg-secondary capitalize">{style}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Cursor Blink */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-fg-secondary">{t('settings.cursorBlink')}</label>
        <Checkbox
          state={terminal.cursorBlink ? 'checked' : 'unchecked'}
          onChange={() => onUpdate({ cursorBlink: !terminal.cursorBlink })}
        />
      </div>

      {/* Scrollback */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-fg-secondary">{t('settings.scrollbackLines')}</label>
        <input
          type="number"
          min={500}
          max={50000}
          step={500}
          value={terminal.scrollback}
          onChange={(e) => onUpdate({ scrollback: Number(e.target.value) || 5000 })}
          className="w-24 px-2 py-1 bg-surface border border-border-input rounded text-fg text-sm
                     text-center focus:outline-none focus:border-primary"
        />
      </div>

      {/* Colors */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-fg-secondary">{t('settings.background')}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={terminal.background}
            onChange={(e) => onUpdate({ background: e.target.value })}
            className="w-8 h-6 rounded border border-border-input bg-transparent cursor-pointer"
          />
          <span className="text-xs text-fg-dim font-mono">{terminal.background}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-fg-secondary">{t('settings.foreground')}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={terminal.foreground}
            onChange={(e) => onUpdate({ foreground: e.target.value })}
            className="w-8 h-6 rounded border border-border-input bg-transparent cursor-pointer"
          />
          <span className="text-xs text-fg-dim font-mono">{terminal.foreground}</span>
        </div>
      </div>

      {/* Reset to theme default */}
      <div className="pt-2">
        <Button variant="ghost" size="xs" onClick={handleResetToThemeDefault}>
          {t('settings.terminal.resetToThemeDefault')}
        </Button>
      </div>
    </div>
  )
}
