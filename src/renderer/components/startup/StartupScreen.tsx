import { useEffect, useState } from 'react'
import { useProjectStore } from '@renderer/stores/project-store'
import ProjectList from './ProjectList'
import ProjectCreateModal from './ProjectCreateModal'

export default function StartupScreen() {
  const [showCreate, setShowCreate] = useState(false)
  const projects = useProjectStore((s) => s.projects)
  const loading = useProjectStore((s) => s.loading)
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return (
    <div className="h-full w-full bg-neutral-900 flex flex-col items-center justify-center select-none">
      <div className="w-[400px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">WSIDN</h1>
          <p className="text-sm text-neutral-500 mt-1">What Should I Do Next</p>
        </div>

        {/* Project list area */}
        <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-neutral-400">Projects</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              + New
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-neutral-500 text-sm">Loading...</div>
            </div>
          ) : (
            <ProjectList
              projects={projects}
              onSelect={setActiveProject}
            />
          )}
        </div>

        {/* Create button */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white
                     transition-colors"
        >
          Create New Project
        </button>
      </div>

      <ProjectCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}
