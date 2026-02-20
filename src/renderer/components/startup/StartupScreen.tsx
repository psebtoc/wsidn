import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'
import Button from '@renderer/components/ui/Button'
import ProjectList from './ProjectList'
import ProjectCreateModal from './ProjectCreateModal'

export default function StartupScreen() {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const projects = useProjectStore((s) => s.projects)
  const loading = useProjectStore((s) => s.loading)
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return (
    <div className="h-full w-full bg-surface flex flex-col items-center justify-center select-none">
      <div className="w-[400px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fg tracking-tight">{t('app.name')}</h1>
          <p className="text-sm text-fg-dim mt-1">{t('app.subtitle')}</p>
        </div>

        {/* Project list area */}
        <div className="bg-elevated/50 rounded-lg border border-border-default/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-fg-muted">{t('startup.projects')}</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              {t('startup.newProject')}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-fg-dim text-sm">{t('common.loading')}</div>
            </div>
          ) : (
            <ProjectList
              projects={projects}
              onSelect={setActiveProject}
            />
          )}
        </div>

        {/* Create button */}
        <Button
          variant="primary"
          fullWidth
          className="py-3 rounded-lg"
          onClick={() => setShowCreate(true)}
        >
          {t('startup.createNewProject')}
        </Button>
      </div>

      <ProjectCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}
