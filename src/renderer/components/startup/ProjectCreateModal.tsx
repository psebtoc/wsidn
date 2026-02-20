import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'
import { projectService } from '@renderer/services/project-service'
import Modal from '@renderer/components/ui/Modal'
import TextInput from '@renderer/components/ui/TextInput'
import Button from '@renderer/components/ui/Button'

interface ProjectCreateModalProps {
  open: boolean
  onClose: () => void
}

export default function ProjectCreateModal({ open, onClose }: ProjectCreateModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const createProject = useProjectStore((s) => s.createProject)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)

  const handleSelectDir = async () => {
    try {
      const dir = await projectService.selectDir()
      if (dir) {
        setPath(dir)
        if (!name) {
          const parts = dir.replace(/\\/g, '/').split('/')
          setName(parts[parts.length - 1] || '')
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projectCreate.failedSelectDir'))
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('projectCreate.nameRequired'))
      return
    }
    if (!path.trim()) {
      setError(t('projectCreate.pathRequired'))
      return
    }

    setCreating(true)
    setError('')
    try {
      const project = await createProject(name.trim(), path.trim())
      setActiveProject(project.id)
      setName('')
      setPath('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projectCreate.failedCreate'))
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && path.trim()) handleCreate()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div onKeyDown={handleKeyDown}>
        <h2 className="text-lg font-semibold text-white mb-4">{t('projectCreate.title')}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">{t('projectCreate.nameLabel')}</label>
            <TextInput
              fullWidth
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">{t('projectCreate.directoryLabel')}</label>
            <div className="flex gap-2">
              <TextInput
                fullWidth
                readOnly
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={t('projectCreate.selectFolder')}
                className="flex-1 cursor-pointer"
                onClick={handleSelectDir}
              />
              <Button variant="secondary" size="sm" onClick={handleSelectDir}>
                {t('common.browse')}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" size="md" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={creating}
            disabled={creating || !name.trim() || !path.trim()}
            onClick={handleCreate}
          >
            {creating ? t('common.creating') : t('common.create')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
