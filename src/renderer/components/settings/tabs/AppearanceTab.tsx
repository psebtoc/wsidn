import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { THEME_PRESETS, type ThemePreset } from '@renderer/themes/theme-presets'

interface AppearanceTabProps {
  selectedTheme: string
  onSelectTheme: (themeId: string) => void
}

function ThemeCard({ preset, isSelected, onSelect }: { preset: ThemePreset; isSelected: boolean; onSelect: () => void }) {
  const { colors } = preset

  return (
    <button
      onClick={onSelect}
      className={`relative rounded-lg border-2 p-3 transition-colors text-left ${
        isSelected
          ? 'border-primary'
          : 'border-border-default hover:border-fg-dimmer'
      }`}
    >
      {/* Selected check */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
             style={{ backgroundColor: colors.accent }}>
          <Check size={12} color="#fff" strokeWidth={3} />
        </div>
      )}

      {/* Color strip preview */}
      <div className="flex gap-1 mb-2.5 h-6 rounded overflow-hidden">
        <div className="flex-1 rounded-sm" style={{ backgroundColor: colors.base }} />
        <div className="flex-1 rounded-sm" style={{ backgroundColor: colors.surface }} />
        <div className="flex-1 rounded-sm" style={{ backgroundColor: colors.elevated }} />
        <div className="w-3 rounded-sm" style={{ backgroundColor: colors.accent }} />
      </div>

      {/* Preview text area */}
      <div className="rounded px-2 py-1.5" style={{ backgroundColor: colors.base }}>
        <div className="text-[10px] font-medium truncate" style={{ color: colors.fg }}>
          {preset.name}
        </div>
        <div className="text-[9px] truncate mt-0.5" style={{ color: colors.fgMuted }}>
          Accent: {colors.accent}
        </div>
      </div>
    </button>
  )
}

export default function AppearanceTab({ selectedTheme, onSelectTheme }: AppearanceTabProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h3 className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-2">
        {t('settings.appearance.theme')}
      </h3>
      <p className="text-xs text-fg-dim mb-4">
        {t('settings.appearance.themeDescription')}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {THEME_PRESETS.map((preset) => (
          <ThemeCard
            key={preset.id}
            preset={preset}
            isSelected={selectedTheme === preset.id}
            onSelect={() => onSelectTheme(preset.id)}
          />
        ))}
      </div>
    </div>
  )
}
