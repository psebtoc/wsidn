import { useTranslation } from 'react-i18next'
import { Maximize2 } from 'lucide-react'
import type { Pane, SplitDirection } from '@renderer/types/project'
import { useSessionStore } from '@renderer/stores/session-store'
import Tooltip from '@renderer/components/ui/Tooltip'

interface CollapsedPaneBarProps {
  pane: Pane
  direction: SplitDirection
  onRestore: () => void
}

export default function CollapsedPaneBar({ pane, direction, onRestore }: CollapsedPaneBarProps) {
  const { t } = useTranslation()
  const claudeActivities = useSessionStore((s) => s.claudeActivities)
  const hasClaudeActivity = pane.sessionIds.some((sid) => claudeActivities[sid])

  const isVerticalBar = direction === 'horizontal'

  return (
    <Tooltip content={t('pane.restorePane')} side={isVerticalBar ? 'right' : 'bottom'}>
      <button
        onClick={onRestore}
        className={`w-full h-full bg-base border border-border-default
                    flex items-center gap-1.5
                    hover:bg-hover/60 transition-colors cursor-pointer overflow-hidden
                    ${isVerticalBar ? 'flex-col justify-center px-0.5 py-2' : 'px-2 py-0.5'}`}
      >
        {hasClaudeActivity && (
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
        )}
        <span
          className={`text-[11px] text-fg-dim truncate ${isVerticalBar ? 'max-w-none' : ''}`}
          style={isVerticalBar ? { writingMode: 'vertical-rl' } : undefined}
        >
          {pane.name}
        </span>
        <Maximize2 size={10} className="text-fg-dimmer shrink-0" />
      </button>
    </Tooltip>
  )
}
