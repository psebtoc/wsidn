import { useState, useRef, useEffect } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { useMindTreeStore } from '@renderer/stores/mindtree-store'
import type { MindTreeItem } from '@renderer/types/project'
import Tooltip from '@renderer/components/ui/Tooltip'
import { useTranslation } from 'react-i18next'

interface DecisionItemProps {
  item: MindTreeItem
  projectId: string
}

export default function DecisionItem({ item, projectId }: DecisionItemProps) {
  const { t } = useTranslation()
  const updateItem = useMindTreeStore((s) => s.updateItem)
  const removeItem = useMindTreeStore((s) => s.removeItem)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const editRef = useRef<HTMLTextAreaElement>(null)

  const hasDescription = item.description.trim().length > 0

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  const handleStartEdit = () => {
    setEditText(item.title)
    setEditing(true)
  }

  const handleSaveEdit = () => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== item.title) {
      updateItem({ id: item.id, title: trimmed })
    }
    setEditing(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeItem(projectId, item.sessionId, item.id)
  }

  return (
    <div>
      <div
        className="group flex items-start gap-1 py-0.5 pr-1 rounded hover:bg-elevated/50 transition-colors"
      >
        {/* Expand indicator */}
        <button
          onClick={() => hasDescription && setExpanded((v) => !v)}
          className={`w-4 h-4 flex items-center justify-center text-fg-dim shrink-0 mt-0.5 ${
            hasDescription ? 'hover:text-fg-secondary cursor-pointer' : 'opacity-0'
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
        <span className="text-[8px] flex-shrink-0 text-blue-400 mt-1">{'\u25C6'}</span>

        {/* Title — supports line breaks + inline edit */}
        {editing ? (
          <textarea
            ref={editRef}
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSaveEdit()
              }
              if (e.key === 'Escape') setEditing(false)
            }}
            onBlur={handleSaveEdit}
            className="flex-1 text-xs text-fg-secondary bg-transparent border-b border-primary
                       outline-none resize-none overflow-hidden min-w-0"
            rows={1}
          />
        ) : (
          <span
            onDoubleClick={handleStartEdit}
            className="flex-1 text-xs text-fg-secondary whitespace-pre-wrap break-words min-w-0"
          >
            {item.title}
          </span>
        )}

        {/* Delete — hidden during edit */}
        {!editing && (
          <Tooltip content={t('common.delete')} side="top">
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center shrink-0
                         text-fg-dim hover:text-red-400 transition-opacity mt-0.5"
            >
              <X size={10} />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Description */}
      {expanded && hasDescription && (
        <div className="ml-5 mr-1 mb-1 px-2 py-1 text-[11px] text-fg-muted bg-elevated/30 rounded leading-relaxed whitespace-pre-wrap">
          {item.description}
        </div>
      )}
    </div>
  )
}
