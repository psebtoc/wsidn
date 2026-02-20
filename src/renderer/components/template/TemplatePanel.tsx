import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useTemplateStore } from '@renderer/stores/template-store'
import type { PromptTemplate } from '@renderer/types/project'
import TemplateEditor from './TemplateEditor'

interface TemplatePanelProps {
  projectId: string
  onInsert?: (content: string) => void
}

export default function TemplatePanel({ projectId, onInsert }: TemplatePanelProps) {
  const { t } = useTranslation()
  const templates = useTemplateStore((s) => s.templates)
  const loadTemplates = useTemplateStore((s) => s.loadTemplates)
  const removeTemplate = useTemplateStore((s) => s.removeTemplate)
  const editingId = useTemplateStore((s) => s.editingId)
  const setEditing = useTemplateStore((s) => s.setEditing)

  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadTemplates(projectId)
  }, [projectId, loadTemplates])

  const globalTemplates = templates.filter((t) => t.scope === 'global')
  const projectTemplates = templates.filter((t) => t.scope === 'project')

  const editingTemplate = editingId ? templates.find((t) => t.id === editingId) : undefined

  const handleDelete = async (id: string) => {
    try {
      await removeTemplate(id)
    } catch (e) {
      console.error('Failed to delete template:', e)
    }
  }

  const handleEditorSave = () => {
    setEditing(null)
    setCreating(false)
  }

  const handleEditorCancel = () => {
    setEditing(null)
    setCreating(false)
  }

  const renderTemplateItem = (tmpl: PromptTemplate) => {
    const firstLine = tmpl.content.split('\n')[0]?.slice(0, 80) || ''

    return (
      <div
        key={tmpl.id}
        onClick={() => onInsert?.(tmpl.content)}
        className={`flex items-start justify-between gap-2 px-2 py-1.5 rounded hover:bg-neutral-800/50 group ${
          onInsert ? 'cursor-pointer' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white truncate">{tmpl.title}</p>
          <p className="text-[10px] text-neutral-500 truncate">{firstLine}</p>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setEditing(tmpl.id)}
            className="px-1.5 py-0.5 text-[10px] text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={() => handleDelete(tmpl.id)}
            className="px-1.5 py-0.5 text-[10px] text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors"
          >
            {t('template.del')}
          </button>
        </div>
      </div>
    )
  }

  const renderSection = (label: string, items: PromptTemplate[]) => (
    <div>
      <h3 className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider px-2 mb-1">
        {label}
      </h3>
      {items.length === 0 ? (
        <p className="text-[10px] text-neutral-600 px-2 py-2">{t('template.noTemplates')}</p>
      ) : (
        items.map(renderTemplateItem)
      )}
    </div>
  )

  return (
    <div className="w-72 h-full bg-neutral-900 border-r border-neutral-700/50 flex flex-col select-none">
      {/* Header */}
      <div className="h-12 px-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <span className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
          {t('template.title')}
        </span>
        <button
          onClick={() => setCreating(true)}
          className="w-5 h-5 flex items-center justify-center rounded text-neutral-400
                     hover:text-white hover:bg-neutral-700 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
        {creating || editingId ? (
          <TemplateEditor
            template={editingTemplate}
            projectId={projectId}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        ) : (
          <>
            {renderSection(t('template.global'), globalTemplates)}
            {renderSection(t('template.project'), projectTemplates)}
          </>
        )}
      </div>
    </div>
  )
}
