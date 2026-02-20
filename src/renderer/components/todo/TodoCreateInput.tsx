import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTodoStore } from '@renderer/stores/todo-store'

interface TodoCreateInputProps {
  sessionId: string
  parentId?: string | null
  onDone: () => void
}

export default function TodoCreateInput({ sessionId, parentId, onDone }: TodoCreateInputProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const addTodo = useTodoStore((s) => s.addTodo)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      onDone()
      return
    }
    await addTodo({ sessionId, title: trimmed, parentId: parentId ?? null })
    setTitle('')
    onDone()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onDone()
    }
  }

  return (
    <div className="px-2 py-1.5">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onDone}
        placeholder={t('todo.newTodoPlaceholder')}
        className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white
                   placeholder-neutral-500 outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  )
}
