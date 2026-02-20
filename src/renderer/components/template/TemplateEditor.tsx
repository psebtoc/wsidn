import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTemplateStore } from '@renderer/stores/template-store'
import type { PromptTemplate, TemplateScope } from '@renderer/types/project'
import Radio from '@renderer/components/ui/Radio'

interface TemplateEditorProps {
  template?: PromptTemplate
  projectId: string
  onSave: () => void
  onCancel: () => void
}

export default function TemplateEditor({ template, projectId, onSave, onCancel }: TemplateEditorProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(template?.title ?? '')
  const [content, setContent] = useState(template?.content ?? '')
  const [scope, setScope] = useState<TemplateScope>(template?.scope ?? 'project')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!template

  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const updateTemplate = useTemplateStore((s) => s.updateTemplate)

  const handleSave = async () => {
    if (!title.trim()) {
      setError(t('template.titleRequired'))
      return
    }
    if (!content.trim()) {
      setError(t('template.contentRequired'))
      return
    }

    setSaving(true)
    setError('')
    try {
      if (isEditing) {
        await updateTemplate({ id: template.id, title: title.trim(), content: content.trim() })
      } else {
        await addTemplate({
          title: title.trim(),
          content: content.trim(),
          scope,
          projectId: scope === 'project' ? projectId : null,
        })
      }
      onSave()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('template.failedSave'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm text-neutral-400 mb-1">{t('template.titleLabel')}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('template.titlePlaceholder')}
          autoFocus
          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                     placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-400 mb-1">{t('template.contentLabel')}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('template.contentPlaceholder')}
          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                     placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 resize-y"
          style={{ minHeight: '120px' }}
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-400 mb-1">{t('template.scopeLabel')}</label>
        <div className="flex gap-4">
          <label className={`flex items-center gap-1.5 text-sm ${isEditing ? 'text-neutral-500' : 'text-neutral-300 cursor-pointer'}`}>
            <Radio
              checked={scope === 'global'}
              onChange={() => setScope('global')}
              disabled={isEditing}
            />
            {t('template.global')}
          </label>
          <label className={`flex items-center gap-1.5 text-sm ${isEditing ? 'text-neutral-500' : 'text-neutral-300 cursor-pointer'}`}>
            <Radio
              checked={scope === 'project'}
              onChange={() => setScope('project')}
              disabled={isEditing}
            />
            {t('template.project')}
          </label>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !content.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-600 disabled:text-neutral-400
                     rounded text-sm text-white font-medium transition-colors"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}
