import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '@renderer/stores/project-store'
import WindowControls from './WindowControls'
import AppSettingsModal from '@renderer/components/settings/AppSettingsModal'

export default function TitleBar() {
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
      className="flex items-center h-8 bg-neutral-950 select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="px-3 text-xs font-semibold text-neutral-400 tracking-wide">WSIDN</div>

      {activeProject && (
        <div
          ref={dropdownRef}
          className="relative"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-neutral-300
                       hover:bg-neutral-800 transition-colors"
          >
            <span className="truncate max-w-[160px]">{activeProject.name}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-neutral-800 border border-neutral-700 rounded-md shadow-xl z-50 py-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p.id)
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors truncate ${
                    p.id === activeProjectId
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-300 hover:bg-neutral-700/50'
                  }`}
                >
                  {p.name}
                </button>
              ))}
              <div className="border-t border-neutral-700 mt-1 pt-1">
                <button
                  onClick={() => {
                    clearActiveProject()
                    setDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-400 hover:text-white
                             hover:bg-neutral-700/50 transition-colors flex items-center gap-1.5"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to projects
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
          className="flex items-center justify-center w-8 h-full text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>

      <WindowControls />

      <AppSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
