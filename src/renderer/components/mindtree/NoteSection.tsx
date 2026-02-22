import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useMindTreeStore } from '@renderer/stores/mindtree-store'
import type { MindTreeItem } from '@renderer/types/project'

interface NoteSectionProps {
  noteItem: MindTreeItem | null
  projectId: string
  sessionId: string
  collapsed: boolean
  onToggleCollapse: () => void
}

const SECTION_COLOR = 'text-green-400'

export default function NoteSection({ noteItem, projectId, sessionId, collapsed, onToggleCollapse }: NoteSectionProps) {
  const { t } = useTranslation()
  const addItem = useMindTreeStore((s) => s.addItem)
  const updateItem = useMindTreeStore((s) => s.updateItem)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localValue, setLocalValue] = useState(noteItem?.description ?? '')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local value when noteItem changes externally
  useEffect(() => {
    setLocalValue(noteItem?.description ?? '')
  }, [noteItem?.description])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setLocalValue(value)

    // Debounced save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (noteItem) {
        updateItem({ id: noteItem.id, description: value })
      } else {
        // Create the note item on first edit
        await addItem({ projectId, sessionId, title: 'note', category: 'note', description: value })
      }
    }, 500)
  }

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Section header */}
      <div
        className="flex items-center px-2 py-1.5 shrink-0 cursor-pointer hover:bg-elevated/30 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-1.5">
          <ChevronRight
            size={10}
            className={`text-fg-dim transition-transform duration-150 ${!collapsed ? 'rotate-90' : ''}`}
          />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${SECTION_COLOR}`}>
            {t('mindtree.note')}
          </span>
        </div>
      </div>

      {/* Textarea */}
      {!collapsed && (
        <div className="flex-1 min-h-0">
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            placeholder={t('mindtree.newNote')}
            className="w-full h-full bg-transparent text-xs text-fg-secondary px-3 py-1
                       outline-none resize-none leading-relaxed placeholder-fg-dim"
          />
        </div>
      )}
    </div>
  )
}
