import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@renderer/components/ui/Modal'
import TextInput from '@renderer/components/ui/TextInput'
import Button from '@renderer/components/ui/Button'

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

  return (
    <Modal open={true} onClose={onCancel} portal width="w-[340px]" className="p-4">
      <h3 className="text-sm font-medium text-neutral-200 mb-3">{t('worktreeDialog.title')}</h3>
      <TextInput
        ref={inputRef}
        fullWidth
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        placeholder="feature/my-branch"
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" size="xs" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="xs" onClick={handleSubmit}>
          {t('common.create')}
        </Button>
      </div>
    </Modal>
  )
}
