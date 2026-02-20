import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTodoStore } from '@renderer/stores/todo-store'
import type { MindTreeCategory } from '@renderer/types/project'

interface CreateInputProps {
  projectId: string
  sessionId: string
  category: MindTreeCategory
  parentId?: string | null
  onDone: () => void
}

export default function CreateInput({ projectId, sessionId, category, parentId, onDone }: CreateInputProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const editableRef = useRef<HTMLDivElement>(null)
  const addTodo = useTodoStore((s) => s.addTodo)
  const submittedRef = useRef(false)

  const isContentEditable = category === 'decision'

  useEffect(() => {
    if (isContentEditable) {
      editableRef.current?.focus()
    } else {
      inputRef.current?.focus()
    }
  }, [isContentEditable])

  const handleSubmit = useCallback(async (text: string) => {
    if (submittedRef.current) return
    const trimmed = text.trim()
    if (!trimmed) {
      onDone()
      return
    }
    submittedRef.current = true
    await addTodo({ projectId, sessionId, title: trimmed, category, parentId: parentId ?? null })
    onDone()
  }, [projectId, sessionId, category, parentId, addTodo, onDone])

  const placeholderKey =
    category === 'task'
      ? 'mindtree.newTask'
      : 'mindtree.newDecision'

  // contentEditable for decision (Enter = newline, Ctrl+Enter = submit, blur = submit)
  if (isContentEditable) {
    return (
      <div className="px-2 py-1.5">
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={t(placeholderKey)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onDone()
              return
            }
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault()
              handleSubmit(editableRef.current?.innerText ?? '')
            }
          }}
          onBlur={() => handleSubmit(editableRef.current?.innerText ?? '')}
          className="w-full bg-elevated border border-border-input rounded px-2 py-1 text-xs text-fg
                     outline-none focus:border-primary transition-colors
                     empty:before:content-[attr(data-placeholder)] empty:before:text-fg-dim"
        />
      </div>
    )
  }

  // Regular input for task
  return (
    <div className="px-2 py-1.5">
      <input
        ref={inputRef}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onDone()
            return
          }
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit(inputRef.current?.value ?? '')
          }
        }}
        onBlur={() => handleSubmit(inputRef.current?.value ?? '')}
        placeholder={t(placeholderKey)}
        className="w-full bg-elevated border border-border-input rounded px-2 py-1 text-xs text-fg
                   placeholder-fg-dim outline-none focus:border-primary transition-colors"
      />
    </div>
  )
}
