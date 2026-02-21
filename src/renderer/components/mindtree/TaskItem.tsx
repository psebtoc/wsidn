import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ListChecks, X } from 'lucide-react'
import { useTodoStore } from '@renderer/stores/todo-store'
import type { Todo, TodoStatus } from '@renderer/types/project'
import ChecklistItem from './ChecklistItem'
import Checkbox from '@renderer/components/ui/Checkbox'
import Tooltip from '@renderer/components/ui/Tooltip'
import { formatRelativeTime } from '@renderer/utils/format-time'

interface TaskItemProps {
  todo: Todo
  projectId: string
}

const STATUS_CYCLE: TodoStatus[] = ['pending', 'in_progress', 'done']

function todoStatusToCheckbox(status: TodoStatus): 'unchecked' | 'indeterminate' | 'checked' {
  if (status === 'done') return 'checked'
  if (status === 'in_progress') return 'indeterminate'
  return 'unchecked'
}

function getStatusColor(status: TodoStatus): string {
  if (status === 'blocked') return 'text-amber-400'
  return ''
}

export default function TaskItem({ todo, projectId }: TaskItemProps) {
  const { t } = useTranslation()
  const todos = useTodoStore((s) => s.todos)
  const expandedIds = useTodoStore((s) => s.expandedIds)
  const toggleExpand = useTodoStore((s) => s.toggleExpand)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const removeTodo = useTodoStore((s) => s.removeTodo)
  const addTodo = useTodoStore((s) => s.addTodo)
  const [addingChecklist, setAddingChecklist] = useState(false)
  const checklistInputRef = useRef<HTMLInputElement>(null)

  const children = todos.filter((t) => t.parentId === todo.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(todo.id)
  const isDone = todo.status === 'done'

  useEffect(() => {
    if (addingChecklist) {
      requestAnimationFrame(() => checklistInputRef.current?.focus())
    }
  }, [addingChecklist])

  const handleStatusToggle = () => {
    // Blocked items → pending when clicked (unblock)
    if (todo.status === 'blocked') {
      updateTodo({ id: todo.id, status: 'pending' })
      return
    }
    const currentIdx = STATUS_CYCLE.indexOf(todo.status)
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length]
    updateTodo({ id: todo.id, status: nextStatus })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeTodo(projectId, todo.sessionId, todo.id)
  }

  const handleChecklistSubmit = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setAddingChecklist(false)
      return
    }
    await addTodo({
      projectId,
      sessionId: todo.sessionId,
      title: trimmed,
      category: 'task',
      parentId: todo.id,
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
        className="group flex items-center gap-1 py-0.5 pr-1 rounded hover:bg-elevated/50 transition-colors"
      >
        {/* Expand/collapse */}
        <button
          onClick={() => (hasChildren || addingChecklist) && toggleExpand(todo.id)}
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
        <Tooltip content={todo.status} side="top">
          {todo.status === 'blocked' ? (
            <button
              onClick={handleStatusToggle}
              className="w-3.5 h-3.5 flex items-center justify-center text-amber-400 shrink-0"
              title="blocked — click to unblock"
            >
              <span className="text-[10px] leading-none">⊘</span>
            </button>
          ) : (
            <Checkbox
              state={todoStatusToCheckbox(todo.status)}
              onChange={handleStatusToggle}
            />
          )}
        </Tooltip>

        {/* Title */}
        <span
          className={`flex-1 text-xs truncate ${
            isDone
              ? 'line-through text-fg-dim'
              : todo.status === 'blocked'
                ? getStatusColor(todo.status)
                : 'text-fg-secondary'
          }`}
        >
          {todo.title}
        </span>

        {/* Time */}
        <span className="text-[9px] text-fg-dimmer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatRelativeTime(todo.createdAt, t)}
        </span>

        {/* Add checklist button */}
        <Tooltip content={t('todo.addChecklist')} side="top">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setAddingChecklist(true)
              if (!isExpanded) toggleExpand(todo.id)
            }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center
                       text-fg-dim hover:text-fg-secondary transition-opacity"
          >
            <ListChecks size={10} />
          </button>
        </Tooltip>

        {/* Delete button */}
        <Tooltip content={t('common.delete')} side="top">
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center
                       text-fg-dim hover:text-red-400 transition-opacity"
          >
            <X size={10} />
          </button>
        </Tooltip>
      </div>

      {/* Checklist children */}
      {isExpanded && children.map((child) => (
        <ChecklistItem key={child.id} todo={child} projectId={projectId} />
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
            placeholder={t('todo.newChecklistItem')}
            className="w-full bg-elevated border border-border-input rounded px-2 py-0.5 text-[11px] text-fg
                       placeholder-fg-dim outline-none focus:border-primary transition-colors"
          />
        </div>
      )}
    </div>
  )
}
