import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTemplateStore } from '@renderer/stores/template-store'
import type { PromptTemplate, TemplateScope } from '@renderer/types/project'
import Radio from '@renderer/components/ui/Radio'
import TextInput from '@renderer/components/ui/TextInput'
import Textarea from '@renderer/components/ui/Textarea'
import Button from '@renderer/components/ui/Button'

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
        <label className="block text-sm text-fg-muted mb-1">{t('template.titleLabel')}</label>
        <TextInput
          fullWidth
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('template.titlePlaceholder')}
        />
      </div>

      <div>
        <label className="block text-sm text-fg-muted mb-1">{t('template.contentLabel')}</label>
        <Textarea
          fullWidth
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('template.contentPlaceholder')}
          style={{ minHeight: '120px' }}
        />
      </div>

      <div>
        <label className="block text-sm text-fg-muted mb-1">{t('template.scopeLabel')}</label>
        <div className="flex gap-4">
          <label className={`flex items-center gap-1.5 text-sm ${isEditing ? 'text-fg-dim' : 'text-fg-secondary cursor-pointer'}`}>
            <Radio
              checked={scope === 'global'}
              onChange={() => setScope('global')}
              disabled={isEditing}
            />
            {t('template.global')}
          </label>
          <label className={`flex items-center gap-1.5 text-sm ${isEditing ? 'text-fg-dim' : 'text-fg-secondary cursor-pointer'}`}>
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
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={saving}
          disabled={saving || !title.trim() || !content.trim()}
          onClick={handleSave}
        >
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  )
}
