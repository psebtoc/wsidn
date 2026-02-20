import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Plus, X } from 'lucide-react'
import { useTodoStore } from '@renderer/stores/todo-store'
import type { Todo, TodoStatus } from '@renderer/types/project'
import TodoCreateInput from './TodoCreateInput'
import Checkbox from '@renderer/components/ui/Checkbox'
import Tooltip from '@renderer/components/ui/Tooltip'

interface TodoItemProps {
  todo: Todo
  depth: number
}

const STATUS_CYCLE: TodoStatus[] = ['pending', 'in_progress', 'done']

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-neutral-600',
}

function todoStatusToCheckbox(status: TodoStatus): 'unchecked' | 'indeterminate' | 'checked' {
  if (status === 'done') return 'checked'
  if (status === 'in_progress') return 'indeterminate'
  return 'unchecked'
}

export default function TodoItem({ todo, depth }: TodoItemProps) {
  const { t } = useTranslation()
  const todos = useTodoStore((s) => s.todos)
  const expandedIds = useTodoStore((s) => s.expandedIds)
  const toggleExpand = useTodoStore((s) => s.toggleExpand)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const removeTodo = useTodoStore((s) => s.removeTodo)
  const [addingChild, setAddingChild] = useState(false)

  const children = todos.filter((t) => t.parentId === todo.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(todo.id)
  const isDone = todo.status === 'done'

  const handleStatusToggle = () => {
    const currentIdx = STATUS_CYCLE.indexOf(todo.status)
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length]
    updateTodo({ id: todo.id, status: nextStatus })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeTodo(todo.id)
  }

  return (
    <div>
      <div
        className="group flex items-center gap-1 py-0.5 pr-1 rounded hover:bg-neutral-800/50 transition-colors"
        style={{ paddingLeft: depth * 16 }}
      >
        {/* Expand/collapse */}
        <button
          onClick={() => hasChildren && toggleExpand(todo.id)}
          className={`w-4 h-4 flex items-center justify-center text-neutral-500 ${
            hasChildren ? 'hover:text-neutral-300 cursor-pointer' : 'cursor-default opacity-0'
          }`}
        >
          {hasChildren && (
            <ChevronRight
              size={10}
              className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
        </button>

        {/* Status checkbox */}
        <Tooltip content={todo.status} side="top">
          <Checkbox
            state={todoStatusToCheckbox(todo.status)}
            onChange={handleStatusToggle}
          />
        </Tooltip>

        {/* Priority dot */}
        <span className={`text-[8px] flex-shrink-0 ${PRIORITY_COLORS[todo.priority]}`}>
          ●
        </span>

        {/* Title */}
        <span
          className={`flex-1 text-xs truncate ${
            isDone ? 'line-through text-neutral-500' : 'text-neutral-200'
          }`}
        >
          {todo.title}
        </span>

        {/* Add child button */}
        <Tooltip content={t('todo.addSubTodo')} side="top">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setAddingChild(true)
              if (!isExpanded) toggleExpand(todo.id)
            }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center
                       text-neutral-500 hover:text-neutral-300 transition-opacity"
          >
            <Plus size={10} />
          </button>
        </Tooltip>

        {/* Delete button */}
        <Tooltip content={t('common.delete')} side="top">
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center
                       text-neutral-500 hover:text-red-400 transition-opacity"
          >
            <X size={10} />
          </button>
        </Tooltip>
      </div>

      {/* Children */}
      {isExpanded && children.map((child) => (
        <TodoItem key={child.id} todo={child} depth={depth + 1} />
      ))}

      {/* Inline create for child */}
      {addingChild && (
        <div style={{ paddingLeft: (depth + 1) * 16 }}>
          <TodoCreateInput
            sessionId={todo.sessionId}
            parentId={todo.id}
            onDone={() => setAddingChild(false)}
          />
        </div>
      )}
    </div>
  )
}
