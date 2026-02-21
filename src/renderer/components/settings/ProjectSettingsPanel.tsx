import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'

interface ProjectSettingsPanelProps {
  projectId: string
}

export default function ProjectSettingsPanel({ projectId }: ProjectSettingsPanelProps) {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))

  if (!project) return null

  return (
    <div className="w-72 h-full bg-surface border-l border-border-default/50 flex flex-col select-none shrink-0">
      {/* Header */}
      <div className="h-12 px-3 border-b border-border-subtle flex items-center shrink-0">
        <span className="text-xs font-medium text-fg-secondary uppercase tracking-wider">
          {t('projectSettings.title')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* Project Info */}
        <div className="mb-4">
          <label className="block text-xs text-fg-dim mb-1">{t('projectSettings.name')}</label>
          <p className="text-sm text-fg-secondary truncate">{project.name}</p>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-fg-dim mb-1">{t('projectSettings.path')}</label>
          <p className="text-xs text-fg-muted break-all">{project.path}</p>
        </div>
      </div>
    </div>
  )
}
