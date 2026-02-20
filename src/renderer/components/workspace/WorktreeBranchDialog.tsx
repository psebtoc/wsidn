import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'

interface WorktreeBranchDialogProps {
  onConfirm: (branchName: string) => void
  onCancel: () => void
}

export default function WorktreeBranchDialog({ onConfirm, onCancel }: WorktreeBranchDialogProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError(t('worktreeDialog.branchRequired'))
      return
    }
    if (/\s/.test(trimmed)) {
      setError(t('worktreeDialog.noSpaces'))
      return
    }
    if (/[~^:?*\[\\]/.test(trimmed)) {
      setError(t('worktreeDialog.invalidChars'))
      return
    }
    onConfirm(trimmed)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-4 w-[340px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-neutral-200 mb-3">{t('worktreeDialog.title')}</h3>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="feature/my-branch"
          className="w-full px-3 py-1.5 text-sm bg-neutral-900 border border-neutral-600 rounded
                     text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-neutral-300 bg-neutral-700 hover:bg-neutral-600
                       rounded transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500
                       rounded transition-colors"
          >
            {t('common.create')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
