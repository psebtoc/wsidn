import type { Project } from '@renderer/types/project'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'
import Tooltip from '@renderer/components/ui/Tooltip'

interface ProjectListProps {
  projects: Project[]
  onSelect: (projectId: string) => void
}

export default function ProjectList({ projects, onSelect }: ProjectListProps) {
  const { t } = useTranslation()
  const deleteProject = useProjectStore((s) => s.deleteProject)

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    await deleteProject(projectId)
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <p className="text-sm">{t('startup.noProjects')}</p>
        <p className="text-sm mt-1">{t('startup.createToStart')}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-1">
      {projects.map((project) => (
        <li key={project.id}>
          <button
            onClick={() => onSelect(project.id)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-md
                       hover:bg-neutral-700/50 transition-colors group text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">
                {project.name}
              </div>
              <div className="text-xs text-neutral-500 truncate mt-0.5">
                {project.path}
              </div>
            </div>
            <Tooltip content={t('startup.deleteProject')} side="left">
              <button
                onClick={(e) => handleDelete(e, project.id)}
                className="ml-3 p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100
                           transition-all shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                </svg>
              </button>
            </Tooltip>
          </button>
        </li>
      ))}
    </ul>
  )
}
