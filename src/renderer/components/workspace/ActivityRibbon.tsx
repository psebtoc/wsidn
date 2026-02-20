import { useTranslation } from 'react-i18next'
import { Monitor, FileText, Settings } from 'lucide-react'
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
    tooltip: 'ribbon.sessions',
    icon: <Monitor size={20} />,
  },
  {
    id: 'template',
    mode: 'overlay',
    tooltip: 'ribbon.templates',
    icon: <FileText size={20} />,
  },
]

interface ActivityRibbonProps {
  activePanel: PanelId | null
  onTogglePanel: (panel: PanelId) => void
}

export default function ActivityRibbon({ activePanel, onTogglePanel }: ActivityRibbonProps) {
  const { t } = useTranslation()

  return (
    <div className="w-12 h-full bg-surface border-r border-border-default/50 flex flex-col items-center py-2 gap-1 shrink-0">
      {PANELS.map((p) => (
        <Tooltip key={p.id} content={t(p.tooltip)} side="right">
          <button
            onClick={() => onTogglePanel(p.id)}
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activePanel === p.id
                ? 'bg-hover text-fg'
                : 'text-fg-dim hover:text-fg-secondary hover:bg-elevated'
            }`}
          >
            {p.icon}
          </button>
        </Tooltip>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project Settings */}
      <Tooltip content={t('ribbon.projectSettings')} side="right">
        <button
          onClick={() => onTogglePanel('projectSettings')}
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
            activePanel === 'projectSettings'
              ? 'bg-hover text-fg'
              : 'text-fg-dim hover:text-fg-secondary hover:bg-elevated'
          }`}
        >
          <Settings size={20} />
        </button>
      </Tooltip>
    </div>
  )
}
