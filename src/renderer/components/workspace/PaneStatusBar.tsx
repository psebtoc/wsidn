import type { Pane, MinimizedPane } from '@renderer/types/project'
import { useSessionStore } from '@renderer/stores/session-store'

interface PaneStatusBarProps {
  panes: Pane[]
  minimizedPanes: MinimizedPane[]
  onRestore: (paneId: string) => void
}

export default function PaneStatusBar({ panes, minimizedPanes, onRestore }: PaneStatusBarProps) {
  const claudeActivities = useSessionStore((s) => s.claudeActivities)

  if (minimizedPanes.length === 0) return null

  return (
    <div className="h-[22px] bg-[#181818] border-t border-neutral-800 flex items-center gap-px px-1 shrink-0">
      {minimizedPanes.map((mp) => {
        const pane = panes.find((p) => p.id === mp.paneId)
        if (!pane) return null

        const hasClaudeActivity = pane.sessionIds.some((sid) => claudeActivities[sid])

        return (
          <button
            key={mp.paneId}
            onClick={() => onRestore(mp.paneId)}
            className="h-[18px] px-1.5 text-[11px] leading-none text-neutral-500
                       border-r border-neutral-700
                       hover:text-neutral-200 hover:bg-neutral-700/60 transition-colors"
          >
            {hasClaudeActivity && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 mr-1 align-middle" />
            )}
            {pane.name}
          </button>
        )
      })}
    </div>
  )
}
