import type { Session, Pane, ClaudeActivity } from '@renderer/types/project'
import { sessionService } from '@renderer/services/session-service'
import { useSessionStore } from '@renderer/stores/session-store'
import Tooltip from '@renderer/components/ui/Tooltip'

interface SessionPanelProps {
  sessions: Session[]
  panes: Pane[]
  focusedPaneId: string | null
  onFocusSession: (paneId: string, sessionId: string) => void
}

export default function SessionPanel({
  sessions,
  panes,
  focusedPaneId,
  onFocusSession,
}: SessionPanelProps) {
  const claudeActivities = useSessionStore((s) => s.claudeActivities)
  const activeSessions = sessions.filter((s) => s.status === 'active')

  const handleRefresh = (session: Session) => {
    if (!session.claudeSessionId) return
    // Send exit command, then after a brief delay resume with the real Claude session ID
    sessionService.terminalInput(session.id, 'exit\n')
    setTimeout(() => {
      sessionService.terminalInput(
        session.id,
        `claude --resume --session-id ${session.claudeSessionId}\n`
      )
    }, 500)
  }

  return (
    <div className="w-72 h-full bg-neutral-900 border-r border-neutral-700/50 flex flex-col select-none">
      {/* Header */}
      <div className="px-3 py-3 border-b border-neutral-800 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
          Sessions
        </span>
        <span className="text-[10px] text-neutral-500">
          {activeSessions.length} active
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
        {panes.length === 0 ? (
          <p className="text-[10px] text-neutral-600 px-2 py-2">No active sessions</p>
        ) : (
          panes.map((pane, paneIdx) => {
            const paneSessions = pane.sessionIds
              .map((id) => activeSessions.find((s) => s.id === id))
              .filter(Boolean) as Session[]

            if (paneSessions.length === 0) return null

            const isFocusedPane = pane.id === focusedPaneId

            return (
              <div key={pane.id}>
                <h3 className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isFocusedPane ? 'bg-blue-500' : 'bg-neutral-600'}`}
                  />
                  Pane {paneIdx + 1}
                </h3>
                {paneSessions.map((session) => {
                  const isActive = session.id === pane.activeSessionId
                  const isFocused = isFocusedPane && isActive

                  return (
                    <div
                      key={session.id}
                      onClick={() => onFocusSession(pane.id, session.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group transition-colors ${
                        isFocused
                          ? 'bg-blue-500/10 border border-blue-500/30'
                          : 'hover:bg-neutral-800/50 border border-transparent'
                      }`}
                    >
                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isActive ? 'bg-green-500' : 'bg-neutral-600'
                            }`}
                          />
                          <p className="text-xs text-white truncate">{session.name}</p>
                          {session.claudeSessionId && (
                            <Tooltip content={`Claude: ${session.claudeModel || 'connected'}`} side="top">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate pl-3">{session.cwd}</p>
                        {session.claudeSessionId && claudeActivities[session.id] && (
                          <ClaudeActivityRow activity={claudeActivities[session.id]} />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Tooltip
                          content={session.claudeSessionId ? 'Refresh (exit + resume)' : 'No Claude session'}
                          side="top"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRefresh(session)
                            }}
                            disabled={!session.claudeSessionId}
                            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                              session.claudeSessionId
                                ? 'text-neutral-400 hover:text-green-400 hover:bg-neutral-700'
                                : 'text-neutral-600 cursor-not-allowed'
                            }`}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M23 4v6h-6" />
                              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                            </svg>
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ClaudeActivityRow({ activity }: { activity: ClaudeActivity }) {
  const isWorking = activity.status === 'working'
  return (
    <div className="flex items-center gap-1.5 pl-3 mt-0.5">
      <span
        className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"
        style={isWorking ? { animation: 'pulse-dot 1.2s ease-in-out infinite' } : undefined}
      />
      <p className="text-[10px] text-orange-300/80 truncate">
        {isWorking ? 'working' : 'idle'} · {activity.task}
      </p>
    </div>
  )
}
