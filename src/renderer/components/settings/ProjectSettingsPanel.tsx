import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'
import Button from '@renderer/components/ui/Button'

interface ProjectSettingsPanelProps {
  projectId: string
}

export default function ProjectSettingsPanel({ projectId }: ProjectSettingsPanelProps) {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))
  const updateProject = useProjectStore((s) => s.updateProject)

  const [initScript, setInitScript] = useState(project?.worktreeInitScript ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setInitScript(project?.worktreeInitScript ?? '')
    setDirty(false)
  }, [project?.worktreeInitScript])

  if (!project) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProject(projectId, {
        worktreeInitScript: initScript.trim() || null,
      })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-72 h-full bg-neutral-900 border-l border-neutral-700/50 flex flex-col select-none shrink-0">
      {/* Header */}
      <div className="h-12 px-3 border-b border-neutral-800 flex items-center shrink-0">
        <span className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
          {t('projectSettings.title')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* Project Info */}
        <div className="mb-4">
          <label className="block text-xs text-neutral-500 mb-1">{t('projectSettings.name')}</label>
          <p className="text-sm text-neutral-300 truncate">{project.name}</p>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-neutral-500 mb-1">{t('projectSettings.path')}</label>
          <p className="text-xs text-neutral-400 break-all">{project.path}</p>
        </div>

        {/* Worktree Init Script */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">
            {t('projectSettings.worktreeInitScript')}
          </label>
          <textarea
            value={initScript}
            onChange={(e) => {
              setInitScript(e.target.value)
              setDirty(true)
            }}
            placeholder={t('projectSettings.worktreeInitPlaceholder')}
            rows={3}
            className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white
                       placeholder:text-neutral-600 resize-none focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-neutral-600 mt-1">
            <Trans i18nKey="projectSettings.worktreeInitDescription" components={{ code: <code className="text-neutral-500" /> }} />
          </p>
        </div>
      </div>

      {/* Save Button */}
      {dirty && (
        <div className="px-3 py-2 border-t border-neutral-800">
          <Button variant="primary" size="xs" fullWidth loading={saving} disabled={saving} onClick={handleSave}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      )}
    </div>
  )
}
