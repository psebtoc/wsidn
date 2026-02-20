import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@renderer/stores/project-store'
import { useSessionStore } from '@renderer/stores/session-store'
import { sessionService } from '@renderer/services/session-service'
import Button from '@renderer/components/ui/Button'
import PaneView from './PaneView'
import PaneStatusBar from './PaneStatusBar'
import ActivityRibbon, { PANELS, type PanelId } from './ActivityRibbon'
import SessionPanel from '@renderer/components/session/SessionPanel'
import TemplatePanel from '@renderer/components/template/TemplatePanel'
import ProjectSettingsPanel from '@renderer/components/settings/ProjectSettingsPanel'
import { calculateBounds, collectDividers } from '@renderer/utils/split-utils'
import type { SplitDirection } from '@renderer/types/project'
import type { PaneBounds } from '@renderer/utils/split-utils'

interface DragState {
  path: string
  direction: SplitDirection
  bounds: PaneBounds
}

interface WorkspaceShellProps {
  projectId: string
}

export default function WorkspaceShell({ projectId }: WorkspaceShellProps) {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))

  const sessions = useSessionStore((s) => s.sessions)
  const panes = useSessionStore((s) => s.panes)
  const splitLayout = useSessionStore((s) => s.splitLayout)
  const focusedPaneId = useSessionStore((s) => s.focusedPaneId)
  const minimizedPanes = useSessionStore((s) => s.minimizedPanes)
  const loadSessions = useSessionStore((s) => s.loadSessions)
  const createFirstSession = useSessionStore((s) => s.createFirstSession)
  const createSessionInPane = useSessionStore((s) => s.createSessionInPane)
  const closeSessionInPane = useSessionStore((s) => s.closeSessionInPane)
  const setActiveSessionInPane = useSessionStore((s) => s.setActiveSessionInPane)
  const splitPane = useSessionStore((s) => s.splitPane)
  const closePane = useSessionStore((s) => s.closePane)
  const focusPaneFn = useSessionStore((s) => s.focusPane)
  const updateSplitRatio = useSessionStore((s) => s.updateSplitRatio)
  const handleClaudeSessionEvent = useSessionStore((s) => s.handleClaudeSessionEvent)
  const loadOtherProjectSessions = useSessionStore((s) => s.loadOtherProjectSessions)
  const createSessionInPaneWithCommand = useSessionStore((s) => s.createSessionInPaneWithCommand)
  const createWorktreeSessionInPane = useSessionStore((s) => s.createWorktreeSessionInPane)
  const minimizePane = useSessionStore((s) => s.minimizePane)
  const restorePane = useSessionStore((s) => s.restorePane)

  const [activePanel, setActivePanel] = useState<PanelId | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions(projectId)
  }, [projectId, loadSessions])

  useEffect(() => {
    loadOtherProjectSessions(projectId)
  }, [projectId, loadOtherProjectSessions])

  // Subscribe to Claude session binding events
  useEffect(() => {
    return window.wsidn.claude.onSessionEvent((event) => {
      handleClaudeSessionEvent(event)
    })
  }, [handleClaudeSessionEvent])

  // Visible panes = those not minimized
  const minimizedPaneIds = useMemo(
    () => new Set(minimizedPanes.map((m) => m.paneId)),
    [minimizedPanes]
  )
  const visiblePanes = useMemo(
    () => panes.filter((p) => !minimizedPaneIds.has(p.id)),
    [panes, minimizedPaneIds]
  )

  // Focused session = active session of the focused pane
  const focusedPane = panes.find((p) => p.id === focusedPaneId)
  const activeSessionId = focusedPane?.activeSessionId ?? null

  const activePanelDef = activePanel ? PANELS.find((p) => p.id === activePanel) : null

  const handleTogglePanel = (panel: PanelId) => {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  const closePanel = useCallback(() => setActivePanel(null), [])

  // Close overlay panel on outside click
  useEffect(() => {
    if (!activePanelDef || activePanelDef.mode !== 'overlay') return

    const handlePointerDown = (e: PointerEvent) => {
      if (overlayPanelRef.current && !overlayPanelRef.current.contains(e.target as Node)) {
        setActivePanel(null)
      }
    }
    // Use timeout so the toggle click doesn't immediately close
    const id = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown)
    }, 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [activePanelDef])

  // Calculate pane bounds from split tree
  const paneBoundsMap = useMemo(() => {
    if (!splitLayout) return null
    return calculateBounds(splitLayout)
  }, [splitLayout])

  // Collect divider positions from split tree
  const dividers = useMemo(() => {
    if (!splitLayout) return []
    return collectDividers(splitLayout)
  }, [splitLayout])

  // Closed sessions that have a lastClaudeSessionId — available for resume
  const closedClaudeSessions = useMemo(
    () => sessions.filter((s) => s.status === 'closed' && s.lastClaudeSessionId),
    [sessions]
  )

  const isSplit = visiblePanes.length > 1 || minimizedPanes.length > 0

  // Drag resize handlers
  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent, path: string, direction: SplitDirection, bounds: PaneBounds) => {
      e.preventDefault()
      setDragState({ path, direction, bounds })
    },
    []
  )

  useEffect(() => {
    if (!dragState) return

    const cursor = dragState.direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.cursor = cursor
    document.body.classList.add('select-none')

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const { direction, bounds } = dragState

      let newRatio: number
      if (direction === 'horizontal') {
        const branchStart = bounds.x * rect.width
        const branchSize = bounds.w * rect.width
        const mouseRel = e.clientX - rect.left - branchStart
        newRatio = mouseRel / branchSize
      } else {
        const branchStart = bounds.y * rect.height
        const branchSize = bounds.h * rect.height
        const mouseRel = e.clientY - rect.top - branchStart
        newRatio = mouseRel / branchSize
      }

      updateSplitRatio(dragState.path, newRatio)
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.cursor = ''
      document.body.classList.remove('select-none')
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, updateSplitRatio])

  if (!project) {
    return null
  }

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar group — spacer pushes ribbon + panels below tab bar level */}
      <div className="flex flex-col shrink-0">
        <div className="h-[35px] bg-base border-b border-b-border-default shrink-0" />
        <div className="flex flex-1 min-h-0">
          <ActivityRibbon activePanel={activePanel} onTogglePanel={handleTogglePanel} />

          {/* Persistent panels (take space in layout) */}
          {activePanelDef?.mode === 'persistent' && activePanel === 'session' && (
            <SessionPanel
              sessions={sessions}
              panes={panes}
              projectId={projectId}
              onFocusSession={(paneId, sessionId) => {
                focusPaneFn(paneId)
                setActiveSessionInPane(paneId, sessionId)
              }}
            />
          )}
          {activePanelDef?.mode === 'persistent' && activePanel === 'template' && (
            <TemplatePanel
              projectId={projectId}
              onInsert={(content) => {
                if (activeSessionId) sessionService.terminalInput(activeSessionId, content)
              }}
            />
          )}
          {activePanel === 'projectSettings' && (
            <ProjectSettingsPanel projectId={projectId} />
          )}
        </div>
      </div>

      {/* Main area (relative for overlay positioning) */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Overlay panels (float over content, below tab bar) */}
        {activePanelDef?.mode === 'overlay' && activePanel === 'template' && (
          <div
            ref={overlayPanelRef}
            className="absolute left-0 top-[35px] bottom-0 z-30"
            style={{ boxShadow: '6px 0 16px rgba(0,0,0,0.4)' }}
          >
            <TemplatePanel
              projectId={projectId}
              onInsert={(content) => {
                if (activeSessionId) sessionService.terminalInput(activeSessionId, content)
                closePanel()
              }}
            />
          </div>
        )}

        <div ref={containerRef} className="flex-1 relative bg-base">
          {visiblePanes.length === 0 && panes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-fg-dim text-sm mb-3">{t('workspace.noActiveSessions')}</p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => createFirstSession(projectId, project.path)}
                >
                  {t('workspace.newSession')}
                </Button>
              </div>
            </div>
          ) : visiblePanes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-fg-dim text-sm mb-3">{t('workspace.allPanesMinimized')}</p>
                <p className="text-fg-dimmer text-xs">{t('workspace.restorePane')}</p>
              </div>
            </div>
          ) : (
            <>
              {visiblePanes.map((pane) => {
                const bounds = paneBoundsMap?.get(pane.id)

                return (
                  <div
                    key={pane.id}
                    className="absolute"
                    style={
                      bounds
                        ? {
                            left: `${bounds.x * 100}%`,
                            top: `${bounds.y * 100}%`,
                            width: `${bounds.w * 100}%`,
                            height: `${bounds.h * 100}%`,
                          }
                        : { left: 0, top: 0, width: '100%', height: '100%' }
                    }
                  >
                    <PaneView
                      pane={pane}
                      sessions={sessions}
                      isFocused={pane.id === focusedPaneId}
                      isSplit={isSplit}
                      onFocus={() => focusPaneFn(pane.id)}
                      onCreateSession={() => createSessionInPane(pane.id, projectId, project.path)}
                      onCloseSession={(sid) => closeSessionInPane(pane.id, sid)}
                      onSetActiveSession={(sid) => setActiveSessionInPane(pane.id, sid)}
                      onSplit={(dir) => {
                        focusPaneFn(pane.id)
                        splitPane(dir, projectId, project.path)
                      }}
                      onClosePane={() => closePane(pane.id)}
                      onMinimize={() => minimizePane(pane.id)}
                      onCreateSessionWithCommand={(cmd) =>
                        createSessionInPaneWithCommand(pane.id, projectId, project.path, cmd)
                      }
                      onCreateWorktreeSession={(branchName) =>
                        createWorktreeSessionInPane(pane.id, projectId, project.path, branchName)
                      }
                      closedClaudeSessions={closedClaudeSessions}
                    />
                  </div>
                )
              })}

              {/* Draggable dividers */}
              {dividers.map((d) => {
                const isHorizontal = d.direction === 'horizontal'
                // Position at the split point
                const pos = isHorizontal
                  ? d.bounds.x + d.bounds.w * d.ratio
                  : d.bounds.y + d.bounds.h * d.ratio

                return (
                  <div
                    key={d.path || 'root'}
                    className={`absolute z-20 group ${
                      isHorizontal ? 'cursor-col-resize' : 'cursor-row-resize'
                    }`}
                    style={
                      isHorizontal
                        ? {
                            left: `calc(${pos * 100}% - 2px)`,
                            top: `${d.bounds.y * 100}%`,
                            width: '5px',
                            height: `${d.bounds.h * 100}%`,
                          }
                        : {
                            left: `${d.bounds.x * 100}%`,
                            top: `calc(${pos * 100}% - 4px)`,
                            width: `${d.bounds.w * 100}%`,
                            height: '5px',
                          }
                    }
                    onMouseDown={(e) =>
                      handleDividerMouseDown(e, d.path, d.direction, d.bounds)
                    }
                  >
                    {/* Visible 1px line */}
                    <div
                      className={`absolute bg-border-default transition-colors duration-150 delay-300 group-hover:bg-primary ${
                        isHorizontal
                          ? 'left-[2px] top-0 bottom-0 w-px'
                          : 'top-[3px] left-0 right-0 h-px'
                      }`}
                    />
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Pane status bar at bottom */}
        <PaneStatusBar
          panes={panes}
          minimizedPanes={minimizedPanes}
          onRestore={restorePane}
        />
      </div>
    </div>
  )
}
