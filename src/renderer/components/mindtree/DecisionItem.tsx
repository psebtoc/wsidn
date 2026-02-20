import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { useTodoStore } from '@renderer/stores/todo-store'
import type { Todo } from '@renderer/types/project'
import Tooltip from '@renderer/components/ui/Tooltip'
import { useTranslation } from 'react-i18next'
import { formatRelativeTime } from '@renderer/utils/format-time'

interface DecisionItemProps {
  todo: Todo
  projectId: string
}

export default function DecisionItem({ todo, projectId }: DecisionItemProps) {
  const { t } = useTranslation()
  const removeTodo = useTodoStore((s) => s.removeTodo)
  const [expanded, setExpanded] = useState(false)

  const hasDescription = todo.description.trim().length > 0

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeTodo(projectId, todo.sessionId, todo.id)
  }

  return (
    <div>
      <div
        className="group flex items-start gap-1 py-0.5 pr-1 rounded hover:bg-elevated/50 transition-colors cursor-pointer"
        onClick={() => hasDescription && setExpanded((v) => !v)}
      >
        {/* Expand indicator */}
        <button
          className={`w-4 h-4 flex items-center justify-center text-fg-dim shrink-0 mt-0.5 ${
            hasDescription ? 'hover:text-fg-secondary' : 'opacity-0'
          }`}
        >
          {hasDescription && (
            <ChevronRight
              size={10}
              className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            />
          )}
        </button>

        {/* Decision marker */}
        <span className="text-[8px] flex-shrink-0 text-blue-400 mt-1">◆</span>

        {/* Title — supports line breaks */}
        <span className="flex-1 text-xs text-fg-secondary whitespace-pre-wrap break-words">
          {todo.title}
        </span>

        {/* Time */}
        <span className="text-[9px] text-fg-dimmer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatRelativeTime(todo.createdAt, t)}
        </span>

        {/* Delete */}
        <Tooltip content={t('common.delete')} side="top">
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center shrink-0
                       text-fg-dim hover:text-red-400 transition-opacity mt-0.5"
          >
            <X size={10} />
          </button>
        </Tooltip>
      </div>

      {/* Description */}
      {expanded && hasDescription && (
        <div className="ml-5 mr-1 mb-1 px-2 py-1 text-[11px] text-fg-muted bg-elevated/30 rounded leading-relaxed whitespace-pre-wrap">
          {todo.description}
        </div>
      )}
    </div>
  )
}
