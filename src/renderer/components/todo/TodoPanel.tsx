import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useTodoStore } from '@renderer/stores/todo-store'
import TodoItem from './TodoItem'
import TodoCreateInput from './TodoCreateInput'
import Tooltip from '@renderer/components/ui/Tooltip'

interface TodoPanelProps {
  sessionId: string
}

export default function TodoPanel({ sessionId }: TodoPanelProps) {
  const { t } = useTranslation()
  const todos = useTodoStore((s) => s.todos)
  const loading = useTodoStore((s) => s.loading)
  const loadTodos = useTodoStore((s) => s.loadTodos)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadTodos(sessionId)
  }, [sessionId, loadTodos])

  const rootTodos = todos.filter((t) => t.parentId === null)

  return (
    <div className="w-64 h-full bg-neutral-900 border-l border-neutral-700/50 flex flex-col select-none shrink-0">
      {/* Header */}
      <div className="px-3 py-3 border-b border-neutral-800 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
          {t('todo.title')}
        </span>
        <Tooltip content={t('todo.addTodo')} side="left">
          <button
            onClick={() => setShowCreate(true)}
            className="w-5 h-5 flex items-center justify-center rounded text-neutral-400
                       hover:text-white hover:bg-neutral-700 transition-colors"
          >
            <Plus size={12} />
          </button>
        </Tooltip>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto px-1 py-2">
        {loading ? (
          <p className="text-xs text-neutral-500 text-center py-4">{t('common.loading')}</p>
        ) : rootTodos.length === 0 && !showCreate ? (
          <p className="text-xs text-neutral-500 text-center py-4">{t('todo.noTodos')}</p>
        ) : (
          rootTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} depth={0} />
          ))
        )}
      </div>

      {/* Create input */}
      {showCreate && (
        <div className="border-t border-neutral-800">
          <TodoCreateInput sessionId={sessionId} onDone={() => setShowCreate(false)} />
        </div>
      )}
    </div>
  )
}
