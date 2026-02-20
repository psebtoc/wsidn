import { useEffect } from 'react'
import { useProjectStore } from '@renderer/stores/project-store'
import { useConfigStore } from '@renderer/stores/config-store'
import TitleBar from '@renderer/components/layout/TitleBar'
import StartupScreen from '@renderer/components/startup/StartupScreen'
import WorkspaceShell from '@renderer/components/workspace/WorkspaceShell'

export default function App(): JSX.Element {
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const loadConfig = useConfigStore((s) => s.loadConfig)

  useEffect(() => {
    loadProjects()
    loadConfig()
  }, [loadProjects, loadConfig])

  return (
    <div className="h-screen w-screen bg-surface text-fg flex flex-col overflow-hidden">
      <TitleBar />
      <div className="flex-1 min-h-0">
        {activeProjectId ? (
          <WorkspaceShell projectId={activeProjectId} />
        ) : (
          <StartupScreen />
        )}
      </div>
    </div>
  )
}
