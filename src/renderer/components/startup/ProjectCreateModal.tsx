import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'
import { projectService } from '@renderer/services/project-service'

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

  if (!open) return null

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
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && name.trim() && path.trim()) handleCreate()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-neutral-800 rounded-lg border border-neutral-700 p-6 w-[480px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">{t('projectCreate.title')}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">{t('projectCreate.nameLabel')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              autoFocus
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                         placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">{t('projectCreate.directoryLabel')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={t('projectCreate.selectFolder')}
                readOnly
                className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                           placeholder:text-neutral-500 cursor-pointer focus:outline-none focus:border-blue-500"
                onClick={handleSelectDir}
              />
              <button
                onClick={handleSelectDir}
                className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-white
                           transition-colors"
              >
                {t('common.browse')}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !path.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-600 disabled:text-neutral-400
                       rounded text-sm text-white font-medium transition-colors"
          >
            {creating ? t('common.creating') : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
