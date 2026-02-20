import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'
import type { TerminalConfig, TerminalColorOverride } from '@renderer/types/project'
import { getThemePreset } from '@renderer/themes/theme-presets'
import Radio from '@renderer/components/ui/Radio'
import Checkbox from '@renderer/components/ui/Checkbox'
import Tooltip from '@renderer/components/ui/Tooltip'

interface TerminalTabProps {
  terminal: TerminalConfig
  themeId: string
  colorOverride: TerminalColorOverride | undefined
  onUpdate: (patch: Partial<TerminalConfig>) => void
  onColorChange: (patch: TerminalColorOverride) => void
  onColorReset: (key: 'background' | 'foreground') => void
}

export default function TerminalTab({ terminal, themeId, colorOverride, onUpdate, onColorChange, onColorReset }: TerminalTabProps) {
  const { t } = useTranslation()
  const preset = getThemePreset(themeId)
  const currentBg = colorOverride?.background ?? preset.colors.terminalBg
  const currentFg = colorOverride?.foreground ?? preset.colors.terminalFg
  const isCustomBg = colorOverride?.background !== undefined
  const isCustomFg = colorOverride?.foreground !== undefined

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

      {/* Terminal Colors */}
      <div className="pt-2 border-t border-border-subtle space-y-3">
        {/* Background */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-fg-secondary">{t('settings.background')}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentBg}
              onChange={(e) => onColorChange({ background: e.target.value })}
              className="w-8 h-7 rounded border border-border-input cursor-pointer bg-transparent"
            />
            {isCustomBg && (
              <Tooltip content={t('settings.terminal.resetToTheme')} side="top">
                <button
                  onClick={() => onColorReset('background')}
                  className="p-1 rounded text-fg-dim hover:text-fg-secondary hover:bg-hover/50 transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Foreground */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-fg-secondary">{t('settings.foreground')}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentFg}
              onChange={(e) => onColorChange({ foreground: e.target.value })}
              className="w-8 h-7 rounded border border-border-input cursor-pointer bg-transparent"
            />
            {isCustomFg && (
              <Tooltip content={t('settings.terminal.resetToTheme')} side="top">
                <button
                  onClick={() => onColorReset('foreground')}
                  className="p-1 rounded text-fg-dim hover:text-fg-secondary hover:bg-hover/50 transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <p className="text-xs text-fg-dim">
          {t('settings.terminal.colorsFromTheme')}
        </p>
      </div>
    </div>
  )
}
