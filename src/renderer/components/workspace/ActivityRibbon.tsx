import Tooltip from '@renderer/components/ui/Tooltip'

export type PanelId = 'session' | 'template'
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
    </div>
  )
}
