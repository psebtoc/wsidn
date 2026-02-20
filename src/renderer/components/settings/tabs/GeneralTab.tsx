import { useTranslation } from 'react-i18next'
import type { AppConfig } from '@renderer/types/project'
import TextInput from '@renderer/components/ui/TextInput'
import Select from '@renderer/components/ui/Select'

interface GeneralTabProps {
  language: AppConfig['language']
  defaultShell: string
  onLanguageChange: (lang: AppConfig['language']) => void
  onShellChange: (shell: string) => void
}

export default function GeneralTab({ language, defaultShell, onLanguageChange, onShellChange }: GeneralTabProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      {/* Language */}
      <div>
        <h3 className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-3">
          {t('settings.language')}
        </h3>
        <Select
          fullWidth
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as AppConfig['language'])}
        >
          {(['ko', 'en'] as const).map((lang) => (
            <option key={lang} value={lang}>
              {t(`settings.lang.${lang}`)}
            </option>
          ))}
        </Select>
        <p className="text-xs text-fg-dim mt-1">
          {t('settings.languageDescription')}
        </p>
      </div>

      {/* Default Shell */}
      <div>
        <h3 className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-3">
          {t('settings.shell')}
        </h3>
        <label className="text-sm text-fg-secondary block mb-1">{t('settings.defaultShell')}</label>
        <TextInput
          fullWidth
          value={defaultShell}
          onChange={(e) => onShellChange(e.target.value)}
          placeholder={t('settings.shellPlaceholder')}
        />
        <p className="text-xs text-fg-dim mt-1">
          {t('settings.shellDescription')}
        </p>
      </div>
    </div>
  )
}
