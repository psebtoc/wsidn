import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Session, Pane, ClaudeActivity } from '@renderer/types/project'
import { sessionService } from '@renderer/services/session-service'
import { useSessionStore } from '@renderer/stores/session-store'

interface SessionPanelProps {
  sessions: Session[]
  panes: Pane[]
  projectId: string
  onFocusSession: (paneId: string, sessionId: string) => void
}

export default function SessionPanel({
  sessions,
  panes,
  projectId,
  onFocusSession,
}: SessionPanelProps) {
  const { t } = useTranslation()
  const claudeActivities = useSessionStore((s) => s.claudeActivities)
  const otherProjectSessions = useSessionStore((s) => s.otherProjectSessions)
  const renamePane = useSessionStore((s) => s.renamePane)
  const activeSessions = sessions.filter((s) => s.status === 'active')

  const [collapsedPanes, setCollapsedPanes] = useState<Set<string>>(new Set())
  const [editingPaneId, setEditingPaneId] = useState<string | null>(null)

  const toggleCollapse = (key: string) => {
    setCollapsedPanes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleRefresh = (session: Session) => {
    const resumeId = session.claudeSessionId ?? session.lastClaudeSessionId
    if (!resumeId) return
    sessionService.terminalInput(session.id, 'exit\n')
    setTimeout(() => {
      sessionService.terminalInput(session.id, `claude --resume ${resumeId}\n`)
    }, 500)
  }

  // Count all active sessions (current + other projects)
  const otherActiveCount = otherProjectSessions.reduce(
    (sum, ps) => sum + ps.sessions.length,
    0
  )
  const totalActive = activeSessions.length + otherActiveCount

  return (
    <div className="w-72 h-full bg-neutral-900 border-r border-neutral-700/50 flex flex-col select-none">
      {/* Header */}
      <div className="h-12 px-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <span className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
          {t('session.title')}
        </span>
        <span className="text-[10px] text-neutral-500">
          {t('session.activeCount', { count: totalActive })}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-1">
        {panes.length === 0 && otherProjectSessions.length === 0 ? (
          <p className="text-[10px] text-neutral-600 px-2 py-2">{t('session.noActiveSessions')}</p>
        ) : (
          <>
            {/* Current project panes */}
            {panes.map((pane) => {
              const paneSessions = pane.sessionIds
                .map((id) => activeSessions.find((s) => s.id === id))
                .filter(Boolean) as Session[]

              if (paneSessions.length === 0) return null

              const paneKey = `pane-${pane.id}`
              const isCollapsed = collapsedPanes.has(paneKey)

              return (
                <div key={pane.id}>
                  <PaneHeader
                    pane={pane}
                    isCollapsed={isCollapsed}
                    isEditing={editingPaneId === pane.id}
                    onToggleCollapse={() => toggleCollapse(paneKey)}
                    onStartEdit={() => setEditingPaneId(pane.id)}
                    onFinishEdit={(name) => {
                      renamePane(pane.id, name)
                      setEditingPaneId(null)
                    }}
                    onCancelEdit={() => setEditingPaneId(null)}
                  />
                  {!isCollapsed &&
                    paneSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        activity={claudeActivities[session.id] ?? null}
                        onClick={() => onFocusSession(pane.id, session.id)}
                        onRefresh={() => handleRefresh(session)}
                      />
                    ))}
                </div>
              )
            })}

            {/* Other projects */}
            {otherProjectSessions.length > 0 && (
              <>
                <div className="border-t border-neutral-800 mx-2 my-2" />
                <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider px-2 mb-1">
                  {t('session.otherProjects')}
                </p>
                {otherProjectSessions.map((ps) => {
                  const groupKey = `project-${ps.project.id}`
                  const isCollapsed = collapsedPanes.has(groupKey)

                  return (
                    <div key={ps.project.id}>
                      <button
                        onClick={() => toggleCollapse(groupKey)}
                        className="w-full text-[10px] font-medium text-neutral-500 uppercase tracking-wider px-2 py-1 flex items-center gap-1 hover:text-neutral-400 transition-colors"
                      >
                        <span className="text-[8px]">{isCollapsed ? '\u25B6' : '\u25BC'}</span>
                        {ps.project.name}
                      </button>
                      {!isCollapsed &&
                        ps.sessions.map((session) => (
                          <SessionCard
                            key={session.id}
                            session={session}
                            activity={null}
                            onClick={undefined}
                            onRefresh={undefined}
                          />
                        ))}
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Pane header with inline rename on double-click */
function PaneHeader({
  pane,
  isCollapsed,
  isEditing,
  onToggleCollapse,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
}: {
  pane: Pane
  isCollapsed: boolean
  isEditing: boolean
  onToggleCollapse: () => void
  onStartEdit: () => void
  onFinishEdit: (name: string) => void
  onCancelEdit: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = useState(pane.name)

  useEffect(() => {
    if (isEditing) {
      setEditValue(pane.name)
      // Focus after render
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [isEditing, pane.name])

  if (isEditing) {
    return (
      <div className="px-2 py-1">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onFinishEdit(editValue)
            if (e.key === 'Escape') onCancelEdit()
          }}
          onBlur={() => onFinishEdit(editValue)}
          className="w-full text-[10px] font-medium text-neutral-300 uppercase tracking-wider
                     bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 outline-none
                     focus:border-blue-500"
        />
      </div>
    )
  }

  return (
    <button
      onClick={onToggleCollapse}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onStartEdit()
      }}
      className="w-full text-[10px] font-medium text-neutral-500 uppercase tracking-wider px-2 py-1 flex items-center gap-1 hover:text-neutral-400 transition-colors"
    >
      <span className="text-[8px]">{isCollapsed ? '\u25B6' : '\u25BC'}</span>
      {pane.name}
    </button>
  )
}

/** 3-state indicator + session name + optional activity line */
function SessionCard({
  session,
  activity,
  onClick,
  onRefresh,
}: {
  session: Session
  activity: ClaudeActivity | null
  onClick: (() => void) | undefined
  onRefresh: (() => void) | undefined
}) {
  // 3-state: no Claude = neutral, Claude idle = orange static, Claude working = orange pulse
  const isWorking = activity?.status === 'working'

  let dotClass = 'bg-neutral-500' // no Claude
  let dotStyle: React.CSSProperties | undefined

  if (session.claudeSessionId) {
    dotClass = 'bg-orange-400'
    if (isWorking) {
      dotStyle = { animation: 'pulse-dot 1.2s ease-in-out infinite' }
    }
  }

  return (
    <div
      onClick={onClick}
      className={`px-2 py-1.5 rounded group transition-colors ${
        onClick ? 'cursor-pointer hover:bg-neutral-800/50' : 'opacity-70'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}
          style={dotStyle}
        />
        <p className="text-xs text-white truncate flex-1">{session.name}</p>
        {onRefresh && session.claudeSessionId && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRefresh()
            }}
            className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-green-400 hover:bg-neutral-700 shrink-0"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
          </button>
        )}
      </div>
      {activity && (
        <p className="text-[10px] text-orange-300/80 truncate pl-3 mt-0.5">
          {activity.task}
        </p>
      )}
    </div>
  )
}
