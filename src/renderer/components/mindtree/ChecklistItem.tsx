import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useMindTreeStore } from '@renderer/stores/mindtree-store'
import type { MindTreeItem } from '@renderer/types/project'
import Tooltip from '@renderer/components/ui/Tooltip'

interface ChecklistItemProps {
  item: MindTreeItem
  projectId: string
}

export default function ChecklistItem({ item, projectId }: ChecklistItemProps) {
  const { t } = useTranslation()
  const updateItem = useMindTreeStore((s) => s.updateItem)
  const removeItem = useMindTreeStore((s) => s.removeItem)

  const isDone = item.status === 'done'

  const handleToggle = () => {
    updateItem({ id: item.id, status: isDone ? 'pending' : 'done', projectId })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeItem(projectId, item.sessionId, item.id)
  }

  return (
    <div className="group flex items-center gap-1.5 py-0.5 pl-5 pr-1 rounded hover:bg-elevated/50 transition-colors">
      {/* Binary checkbox */}
      <button
        onClick={handleToggle}
        className={`w-3 h-3 flex-shrink-0 rounded-sm border flex items-center justify-center transition-colors ${
          isDone ? 'bg-primary/60 border-primary/60' : 'border-fg-dimmer hover:border-fg-muted'
        }`}
      >
        {isDone && (
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span
        className={`flex-1 text-[11px] truncate ${
          isDone ? 'line-through text-fg-dimmer' : 'text-fg-muted'
        }`}
      >
        {item.title}
      </span>

      {/* Delete */}
      <Tooltip content={t('common.delete')} side="top">
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 flex items-center justify-center shrink-0
                     text-fg-dim hover:text-red-400 transition-opacity"
        >
          <X size={8} />
        </button>
      </Tooltip>
    </div>
  )
}
