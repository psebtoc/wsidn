import Tooltip from '@renderer/components/ui/Tooltip'

export type PanelId = 'session' | 'template' | 'projectSettings'
export type PanelMode = 'overlay' | 'persistent'

export interface PanelDef {
  id: PanelId
  mode: PanelMode
  icon: React.ReactNode
  tooltip: string
}

export const PANELS: PanelDef[] = [
  {
    id: 'session',
    mode: 'persistent',
    tooltip: 'Sessions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 8h2" />
      </svg>
    ),
  },
  {
    id: 'template',
    mode: 'overlay',
    tooltip: 'Templates',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
]

interface ActivityRibbonProps {
  activePanel: PanelId | null
  onTogglePanel: (panel: PanelId) => void
}

export default function ActivityRibbon({ activePanel, onTogglePanel }: ActivityRibbonProps) {
  return (
    <div className="w-10 h-full bg-neutral-900 border-r border-neutral-700/50 flex flex-col items-center py-2 gap-1 shrink-0">
      {PANELS.map((p) => (
        <Tooltip key={p.id} content={p.tooltip} side="right">
          <button
            onClick={() => onTogglePanel(p.id)}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              activePanel === p.id
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            {p.icon}
          </button>
        </Tooltip>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project Settings */}
      <Tooltip content="Project Settings" side="right">
        <button
          onClick={() => onTogglePanel('projectSettings')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activePanel === 'projectSettings'
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </Tooltip>
    </div>
  )
}
