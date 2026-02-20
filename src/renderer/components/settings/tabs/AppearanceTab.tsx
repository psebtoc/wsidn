import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { THEME_PRESETS, ACCENT_COLORS, getThemePreset, type ThemePreset } from '@renderer/themes/theme-presets'

interface AppearanceTabProps {
  selectedTheme: string
  selectedAccent: string | null
  onSelectTheme: (themeId: string) => void
  onSelectAccent: (accentId: string | null) => void
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

function AccentSwatch({
  color,
  isSelected,
  onSelect,
}: {
  color: string
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
        isSelected ? 'ring-2 ring-offset-2 ring-offset-surface' : 'hover:scale-110'
      }`}
      style={{
        backgroundColor: color,
        ...(isSelected ? { ringColor: color } : {}),
      }}
      title={color}
    >
      {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
    </button>
  )
}

export default function AppearanceTab({ selectedTheme, selectedAccent, onSelectTheme, onSelectAccent }: AppearanceTabProps) {
  const { t } = useTranslation()
  const currentThemePreset = getThemePreset(selectedTheme)

  return (
    <div>
      {/* Theme presets */}
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

      {/* Accent color picker */}
      <h3 className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-2 mt-6">
        {t('settings.appearance.accentColor')}
      </h3>
      <p className="text-xs text-fg-dim mb-4">
        {t('settings.appearance.accentDescription')}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Default (theme's built-in accent) */}
        <button
          onClick={() => onSelectAccent(null)}
          className={`h-7 px-2.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all ${
            selectedAccent === null
              ? 'ring-2 ring-offset-2 ring-offset-surface ring-primary text-fg'
              : 'text-fg-muted hover:text-fg-secondary'
          }`}
          style={{
            backgroundColor: currentThemePreset.colors.accent,
            color: '#fff',
          }}
        >
          {selectedAccent === null && <Check size={12} strokeWidth={3} />}
          {t('settings.appearance.accentDefault')}
        </button>

        {/* Accent color swatches */}
        {ACCENT_COLORS.map((accent) => (
          <AccentSwatch
            key={accent.id}
            color={accent.value}
            isSelected={selectedAccent === accent.id}
            onSelect={() => onSelectAccent(accent.id)}
          />
        ))}
      </div>
    </div>
  )
}
