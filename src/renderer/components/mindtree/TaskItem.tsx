import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ListChecks, X } from 'lucide-react'
import { useMindTreeStore } from '@renderer/stores/mindtree-store'
import type { MindTreeItem, MindTreeItemStatus } from '@renderer/types/project'
import ChecklistItem from './ChecklistItem'
import Checkbox from '@renderer/components/ui/Checkbox'
import Tooltip from '@renderer/components/ui/Tooltip'

interface TaskItemProps {
  item: MindTreeItem
  projectId: string
}

const STATUS_CYCLE: MindTreeItemStatus[] = ['pending', 'in_progress', 'done', 'blocked']

function statusToCheckbox(status: MindTreeItemStatus): 'unchecked' | 'indeterminate' | 'checked' {
  if (status === 'done') return 'checked'
  if (status === 'in_progress') return 'indeterminate'
  return 'unchecked'
}

function getStatusColor(status: MindTreeItemStatus): string {
  if (status === 'blocked') return 'text-amber-400'
  return ''
}

export default function TaskItem({ item, projectId }: TaskItemProps) {
  const { t } = useTranslation()
  const items = useMindTreeStore((s) => s.itemsBySession[item.sessionId] ?? [])
  const expandedIds = useMindTreeStore((s) => s.expandedIds)
  const toggleExpand = useMindTreeStore((s) => s.toggleExpand)
  const updateItem = useMindTreeStore((s) => s.updateItem)
  const removeItem = useMindTreeStore((s) => s.removeItem)
  const addItem = useMindTreeStore((s) => s.addItem)
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const checklistInputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const children = items.filter((t) => t.parentId === item.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(item.id)
  const isDone = item.status === 'done'

  useEffect(() => {
    if (addingChecklist) {
      requestAnimationFrame(() => checklistInputRef.current?.focus())
    }
  }, [addingChecklist])

  const handleStatusToggle = () => {
    const currentIdx = STATUS_CYCLE.indexOf(item.status)
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length]
    updateItem({ id: item.id, status: nextStatus, projectId })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeItem(projectId, item.sessionId, item.id)
  }

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
      updateItem({ id: item.id, title: trimmed, projectId })
    }
    setEditing(false)
  }

  const handleChecklistSubmit = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setAddingChecklist(false)
      return
    }
    await addItem({
      projectId,
      sessionId: item.sessionId,
      title: trimmed,
      category: 'task',
      parentId: item.id,
    })
    // Keep input open for rapid entry, clear value
    if (checklistInputRef.current) {
      checklistInputRef.current.value = ''
      checklistInputRef.current.focus()
    }
  }

  return (
    <div>
      <div
        className="group flex items-start gap-1 py-0.5 pr-1 rounded hover:bg-elevated/50 transition-colors"
      >
        {/* Expand/collapse */}
        <button
          onClick={() => (hasChildren || addingChecklist) && toggleExpand(item.id)}
          className={`w-4 h-4 flex items-center justify-center text-fg-dim ${
            hasChildren || addingChecklist ? 'hover:text-fg-secondary cursor-pointer' : 'cursor-default opacity-0'
          }`}
        >
          {(hasChildren || addingChecklist) && (
            <ChevronRight
              size={10}
              className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
        </button>

        {/* Status checkbox */}
        <Tooltip content={item.status} side="top">
          {item.status === 'blocked' ? (
            <button
              onClick={handleStatusToggle}
              className="w-3.5 h-3.5 flex items-center justify-center text-amber-400 shrink-0"
              title="blocked — click to unblock"
            >
              <span className="text-[10px] leading-none">{'\u2298'}</span>
            </button>
          ) : (
            <Checkbox
              state={statusToCheckbox(item.status)}
              onChange={handleStatusToggle}
            />
          )}
        </Tooltip>

        {/* Title */}
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
            className={`flex-1 text-xs whitespace-pre-wrap break-words min-w-0 ${
              isDone
                ? 'line-through text-fg-dim'
                : item.status === 'blocked'
                  ? getStatusColor(item.status)
                  : 'text-fg-secondary'
            }`}
          >
            {item.title}
          </span>
        )}

        {/* Action buttons — hidden during edit */}
        {!editing && (
          <>
            <Tooltip content={t('mindtree.addChecklist')} side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAddingChecklist(true)
                  if (!isExpanded) toggleExpand(item.id)
                }}
                className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center shrink-0
                           text-fg-dim hover:text-fg-secondary transition-opacity"
              >
                <ListChecks size={10} />
              </button>
            </Tooltip>
            <Tooltip content={t('common.delete')} side="top">
              <button
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center shrink-0
                           text-fg-dim hover:text-red-400 transition-opacity"
              >
                <X size={10} />
              </button>
            </Tooltip>
          </>
        )}
      </div>

      {/* Checklist children */}
      {isExpanded && children.map((child) => (
        <ChecklistItem key={child.id} item={child} projectId={projectId} />
      ))}

      {/* Inline checklist input */}
      {isExpanded && addingChecklist && (
        <div className="pl-5 pr-1 py-0.5">
          <input
            ref={checklistInputRef}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAddingChecklist(false)
                return
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                handleChecklistSubmit(checklistInputRef.current?.value ?? '')
              }
            }}
            onBlur={() => {
              const val = checklistInputRef.current?.value ?? ''
              if (val.trim()) {
                handleChecklistSubmit(val)
              }
              setAddingChecklist(false)
            }}
            placeholder={t('mindtree.newChecklistItem')}
            className="w-full bg-elevated border border-border-input rounded px-2 py-0.5 text-[11px] text-fg
                       placeholder-fg-dim outline-none focus:border-primary transition-colors"
          />
        </div>
      )}
    </div>
  )
}
