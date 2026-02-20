import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTemplateStore } from '@renderer/stores/template-store'
import Tooltip from '@renderer/components/ui/Tooltip'

interface QuickInsertBarProps {
  projectId: string
  onInsert: (content: string) => void
}

export default function QuickInsertBar({ projectId, onInsert }: QuickInsertBarProps) {
  const { t } = useTranslation()
  const templates = useTemplateStore((s) => s.templates)
  const loadTemplates = useTemplateStore((s) => s.loadTemplates)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    loadTemplates(projectId)
  }, [projectId, loadTemplates])

  const filtered = useMemo(() => {
    if (!filter.trim()) return templates
    const lower = filter.toLowerCase()
    return templates.filter((t) => t.title.toLowerCase().includes(lower))
  }, [templates, filter])

  if (templates.length === 0) return null

  return (
    <div className="flex items-center gap-2 h-8 px-2 bg-elevated border-b border-border-default/50 shrink-0">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t('template.filterPlaceholder')}
        className="w-24 px-2 py-0.5 bg-surface border border-border-default rounded text-xs text-fg
                   placeholder:text-fg-dim focus:outline-none focus:border-primary shrink-0"
      />
      <div className="flex-1 flex gap-1.5 overflow-x-auto min-w-0">
        {filtered.map((t) => (
          <Tooltip key={t.id} content={t.content} side="bottom">
            <button
              onClick={() => onInsert(t.content)}
              className="px-2.5 py-0.5 bg-hover hover:bg-fg-dimmer rounded-full text-xs text-fg-secondary
                         hover:text-fg transition-colors whitespace-nowrap shrink-0"
            >
              {t.title}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}
