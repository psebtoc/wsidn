import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Plus } from 'lucide-react'
import type { MindTreeCategory, MindTreeItem } from '@renderer/types/project'
import { useSessionStore } from '@renderer/stores/session-store'
import TaskItem from './TaskItem'
import DecisionItem from './DecisionItem'
import CreateInput from './CreateInput'
import Tooltip from '@renderer/components/ui/Tooltip'

interface MindTreeSectionProps {
  category: MindTreeCategory
  items: MindTreeItem[]
  projectId: string
  sessionId: string
  collapsed: boolean
  onToggleCollapse: () => void
  forceCreate?: boolean
}

const SECTION_LABELS: Record<MindTreeCategory, string> = {
  task: 'mindtree.task',
  decision: 'mindtree.decision',
  note: 'mindtree.note',
}

const SECTION_COLORS: Record<MindTreeCategory, string> = {
  task: 'text-primary',
  decision: 'text-blue-400',
  note: 'text-green-400',
}

export default function MindTreeSection({
  category,
  items,
  projectId,
  sessionId,
  collapsed,
  onToggleCollapse,
  forceCreate,
}: MindTreeSectionProps) {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const clearMindTreeCreate = useSessionStore((s) => s.clearMindTreeCreate)

  useEffect(() => {
    if (forceCreate) {
      setShowCreate(true)
      if (collapsed) onToggleCollapse()
    }
  }, [forceCreate]) // eslint-disable-line react-hooks/exhaustive-deps

  const rootItems = items.filter((item) => item.parentId === null)

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Section header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 shrink-0 cursor-pointer hover:bg-elevated/30 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-1.5">
          <ChevronRight
            size={10}
            className={`text-fg-dim transition-transform duration-150 ${!collapsed ? 'rotate-90' : ''}`}
          />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${SECTION_COLORS[category]}`}>
            {t(SECTION_LABELS[category])}
          </span>
          <span className="text-[10px] text-fg-dimmer">{items.length}</span>
        </div>
        <Tooltip content={t('mindtree.add')} side="top">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowCreate(true)
              if (collapsed) onToggleCollapse()
            }}
            className="w-4 h-4 flex items-center justify-center rounded text-fg-dim
                       hover:text-fg-secondary transition-colors"
          >
            <Plus size={10} />
          </button>
        </Tooltip>
      </div>

      {/* Section content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-1 min-h-0">
          {rootItems.length === 0 && !showCreate ? (
            <p className="text-[10px] text-fg-dim text-center py-2">
              {t('mindtree.empty')}
            </p>
          ) : (
            rootItems.map((item) => {
              if (category === 'task') return <TaskItem key={item.id} item={item} projectId={projectId} />
              return <DecisionItem key={item.id} item={item} projectId={projectId} />
            })
          )}
          {showCreate && (
            <CreateInput
              projectId={projectId}
              sessionId={sessionId}
              category={category}
              onDone={() => {
                setShowCreate(false)
                clearMindTreeCreate()
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
