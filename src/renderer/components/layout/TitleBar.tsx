import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ArrowLeft, Settings } from 'lucide-react'
import { useProjectStore } from '@renderer/stores/project-store'
import WindowControls from './WindowControls'
import AppSettingsModal from '@renderer/components/settings/AppSettingsModal'

export default function TitleBar() {
  const { t } = useTranslation()
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const clearActiveProject = useProjectStore((s) => s.clearActiveProject)

  const activeProject = projects.find((p) => p.id === activeProjectId)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  return (
    <div
      className="flex items-center h-8 bg-base select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="px-3 text-xs font-semibold text-fg-muted tracking-wide">WSIDN</div>

      {activeProject && (
        <div
          ref={dropdownRef}
          className="relative"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-fg-secondary
                       hover:bg-elevated transition-colors"
          >
            <span className="truncate max-w-[160px]">{activeProject.name}</span>
            <ChevronDown size={10} className={`transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-elevated border border-border-default rounded-md shadow-xl z-50 py-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p.id)
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors truncate ${
                    p.id === activeProjectId
                      ? 'bg-hover text-fg'
                      : 'text-fg-secondary hover:bg-hover/50'
                  }`}
                >
                  {p.name}
                </button>
              ))}
              <div className="border-t border-border-default mt-1 pt-1">
                <button
                  onClick={() => {
                    clearActiveProject()
                    setDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-fg-muted hover:text-fg
                             hover:bg-hover/50 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={10} />
                  {t('titleBar.backToProjects')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Settings */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center justify-center w-8 h-full text-fg-dim hover:text-fg-secondary transition-colors"
        >
          <Settings size={14} />
        </button>
      </div>

      <WindowControls />

      <AppSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
