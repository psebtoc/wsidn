import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, ChevronDown, Columns2, Rows2, SquareCheckBig, Minus } from 'lucide-react'
import type { Pane, Session, SplitDirection, ResumeHistoryEntry } from '@renderer/types/project'
import { useDndStore } from '@renderer/stores/dnd-store'
import { useSessionStore } from '@renderer/stores/session-store'
import Tooltip from '@renderer/components/ui/Tooltip'
import TodoPanel from '@renderer/components/todo/TodoPanel'
import TerminalPane from './TerminalPane'
import SessionContextMenu from './SessionContextMenu'
import WorktreeBranchDialog from './WorktreeBranchDialog'

type DropEdge = 'top' | 'bottom' | 'left' | 'right' | null

interface PaneViewProps {
  pane: Pane
  sessions: Session[]
  isFocused: boolean
  isSplit: boolean
  onFocus: () => void
  onCreateSession: () => void
  onCloseSession: (sessionId: string) => void
  onSetActiveSession: (sessionId: string) => void
  onSplit: (direction: SplitDirection) => void
  onClosePane: () => void
  onMinimize?: () => void
  onCreateSessionWithCommand?: (command: string) => void
  onCreateWorktreeSession?: (branchName: string) => void
  resumeHistory?: ResumeHistoryEntry[]
}

export default function PaneView({
  pane,
  sessions,
  isFocused,
  isSplit,
  onFocus,
  onCreateSession,
  onCloseSession,
  onSetActiveSession,
  onSplit,
  onClosePane,
  onMinimize,
  onCreateSessionWithCommand,
  onCreateWorktreeSession,
  resumeHistory = []
}: PaneViewProps) {
  const { t } = useTranslation()
  const [showTodo, setShowTodo] = useState(false)
  const [tabDropIndex, setTabDropIndex] = useState<number | null>(null)
  const [tabDropSide, setTabDropSide] = useState<'left' | 'right'>('left')
  const [dropEdge, setDropEdge] = useState<DropEdge>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuAnchor, setContextMenuAnchor] = useState<DOMRect | null>(null)
  const [showWorktreeDialog, setShowWorktreeDialog] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const tabScrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement | HTMLDivElement>(null)

  // Custom scrollbar state
  const [scrollInfo, setScrollInfo] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 })
  const [tabBarHovered, setTabBarHovered] = useState(false)
  const [thumbDragging, setThumbDragging] = useState(false)

  const dragging = useDndStore((s) => s.dragging)
  const setDragging = useDndStore((s) => s.setDragging)
  const reorderSession = useSessionStore((s) => s.reorderSession)
  const moveSessionToPane = useSessionStore((s) => s.moveSessionToPane)
  const moveSessionToNewSplit = useSessionStore((s) => s.moveSessionToNewSplit)
  const renameSession = useSessionStore((s) => s.renameSession)

  useEffect(() => {
    if (editingSessionId) {
      requestAnimationFrame(() => editInputRef.current?.select())
    }
  }, [editingSessionId])

  // Auto-scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }
  }, [pane.activeSessionId])

  // Track scroll state for custom scrollbar
  useEffect(() => {
    const el = tabScrollRef.current
    if (!el) return

    const update = () => {
      setScrollInfo({
        scrollLeft: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      })
    }

    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()

    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [pane.sessionIds.length])

  const hasTabOverflow = scrollInfo.scrollWidth > scrollInfo.clientWidth + 1
  const showScrollbar = hasTabOverflow && (tabBarHovered || thumbDragging)

  const thumbStyle = useMemo(() => {
    if (!hasTabOverflow) return { left: '0%', width: '0%' }
    const ratio = scrollInfo.clientWidth / scrollInfo.scrollWidth
    const leftPct = (scrollInfo.scrollLeft / scrollInfo.scrollWidth) * 100
    const widthPct = ratio * 100
    return { left: `${leftPct}%`, width: `${widthPct}%` }
  }, [hasTabOverflow, scrollInfo])

  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = tabScrollRef.current
    if (!el) return

    setThumbDragging(true)
    const startX = e.clientX
    const startScrollLeft = el.scrollLeft

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const scrollRatio = el.scrollWidth / el.clientWidth
      el.scrollLeft = startScrollLeft + dx * scrollRatio
    }

    const handleMouseUp = () => {
      setThumbDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [])

  const paneSessions = pane.sessionIds
    .map((id) => sessions.find((s) => s.id === id))
    .filter(Boolean) as Session[]

  const activeSessionId = pane.activeSessionId

  // --- Tab drag handlers ---

  const handleTabDragStart = useCallback(
    (e: React.DragEvent, sessionId: string) => {
      e.dataTransfer.setData('text/plain', sessionId)
      e.dataTransfer.effectAllowed = 'move'
      setDragging({ sessionId, sourcePaneId: pane.id })
    },
    [pane.id, setDragging]
  )

  const handleTabDragEnd = useCallback(() => {
    setDragging(null)
    setTabDropIndex(null)
  }, [setDragging])

  const handleTabDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const rect = e.currentTarget.getBoundingClientRect()
      const midX = rect.left + rect.width / 2
      const side = e.clientX < midX ? 'left' : 'right'
      setTabDropIndex(index)
      setTabDropSide(side)
    },
    []
  )

  const handleTabDrop = useCallback(
    (e: React.DragEvent, dropIdx: number) => {
      e.preventDefault()
      if (!dragging) return

      const { sessionId, sourcePaneId } = dragging
      const finalIndex = tabDropSide === 'right' ? dropIdx + 1 : dropIdx

      if (sourcePaneId === pane.id) {
        // Same pane reorder
        const currentIdx = pane.sessionIds.indexOf(sessionId)
        // Adjust index if moving forward in the same list
        let adjustedIndex = finalIndex
        if (currentIdx < finalIndex) adjustedIndex = Math.max(0, finalIndex - 1)
        reorderSession(pane.id, sessionId, adjustedIndex)
      } else {
        // Cross-pane move
        moveSessionToPane(sessionId, sourcePaneId, pane.id, finalIndex)
      }

      setTabDropIndex(null)
      setDragging(null)
    },
    [dragging, pane.id, pane.sessionIds, tabDropSide, reorderSession, moveSessionToPane, setDragging]
  )

  const handleSpacerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setTabDropIndex(-1) // sentinel for "end"
    setTabDropSide('right')
  }, [])

  const handleSpacerDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!dragging) return

      const { sessionId, sourcePaneId } = dragging
      const endIndex = pane.sessionIds.length

      if (sourcePaneId === pane.id) {
        reorderSession(pane.id, sessionId, endIndex - 1)
      } else {
        moveSessionToPane(sessionId, sourcePaneId, pane.id, endIndex)
      }

      setTabDropIndex(null)
      setDragging(null)
    },
    [dragging, pane.id, pane.sessionIds.length, reorderSession, moveSessionToPane, setDragging]
  )

  const handleSpacerDragLeave = useCallback(() => {
    setTabDropIndex(null)
  }, [])

  // --- Content area (terminal) drop zone handlers ---

  const computeEdge = useCallback((e: React.DragEvent, overlayEl: HTMLElement | null): DropEdge => {
    const rect = overlayEl
      ? overlayEl.getBoundingClientRect()
      : contentRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // Check which edge zone the cursor is in (25% from each edge)
    const threshold = 0.25
    const distTop = y
    const distBottom = 1 - y
    const distLeft = x
    const distRight = 1 - x

    const min = Math.min(distTop, distBottom, distLeft, distRight)
    if (min > threshold) return null

    if (min === distTop) return 'top'
    if (min === distBottom) return 'bottom'
    if (min === distLeft) return 'left'
    return 'right'
  }, [])

  // Overlay drag handlers — these fire on the transparent overlay that sits above xterm
  const handleOverlayDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDropEdge(computeEdge(e, e.currentTarget as HTMLElement))
    },
    [computeEdge]
  )

  const handleOverlayDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving to outside the overlay
    const target = e.currentTarget as HTMLElement
    if (!target.contains(e.relatedTarget as Node)) {
      setDropEdge(null)
    }
  }, [])

  const handleOverlayDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const currentDragging = useDndStore.getState().dragging
      if (!currentDragging) {
        setDropEdge(null)
        return
      }

      // Compute edge directly from the drop event position to avoid stale state
      const edge = computeEdge(e, e.currentTarget as HTMLElement)
      if (!edge) {
        setDropEdge(null)
        return
      }

      const { sessionId, sourcePaneId } = currentDragging
      const direction: SplitDirection = edge === 'left' || edge === 'right' ? 'horizontal' : 'vertical'
      const newPaneFirst = edge === 'left' || edge === 'top'

      moveSessionToNewSplit(sessionId, sourcePaneId, pane.id, direction, newPaneFirst)

      setDropEdge(null)
      setDragging(null)
    },
    [pane.id, computeEdge, moveSessionToNewSplit, setDragging]
  )

  // Whether to show the transparent drag-capture overlay above the terminal
  const showDragOverlay = dragging && !(dragging.sourcePaneId === pane.id && pane.sessionIds.length <= 1)

  // Render drop indicator for tabs
  const renderTabDropIndicator = (index: number, side: 'left' | 'right') => {
    if (tabDropIndex === null || !dragging) return null
    if (tabDropIndex !== index) return null
    // Don't show indicator on the dragged tab itself
    if (dragging.sourcePaneId === pane.id && pane.sessionIds[index] === dragging.sessionId) return null

    return (
      <div
        className={`absolute top-1 bottom-1 w-[2px] bg-primary z-10 ${
          side === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
        }`}
      />
    )
  }

  // Render edge drop overlay on content area
  const renderDropOverlay = () => {
    if (!dragging || !dropEdge) return null
    // Don't show if dragging within same pane with only one session
    if (dragging.sourcePaneId === pane.id && pane.sessionIds.length <= 1) return null

    const edgeStyles: Record<string, string> = {
      top: 'inset-x-0 top-0 h-1/4',
      bottom: 'inset-x-0 bottom-0 h-1/4',
      left: 'inset-y-0 left-0 w-1/4',
      right: 'inset-y-0 right-0 w-1/4',
    }

    return (
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className={`absolute ${edgeStyles[dropEdge]} bg-primary/20 border-2 border-primary/40 rounded`} />
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col" onClick={onFocus}>
      {/* Tab bar */}
      <div
        className="flex h-[35px] bg-neutral-950 shrink-0 relative"
        onMouseEnter={() => setTabBarHovered(true)}
        onMouseLeave={() => setTabBarHovered(false)}
      >
        {/* Tabs scroll area */}
        <div ref={tabScrollRef} className="flex items-stretch tab-scroll min-w-0">
          {paneSessions.map((session, index) => {
            const isActive = session.id === pane.activeSessionId
            const isDragged = dragging?.sessionId === session.id && dragging?.sourcePaneId === pane.id
            const isEditing = editingSessionId === session.id

            if (isEditing) {
              return (
                <div
                  key={session.id}
                  ref={isActive ? activeTabRef as React.Ref<HTMLDivElement> : undefined}
                  className={`relative flex items-center px-1 shrink-0 ${
                    isActive
                      ? `border border-neutral-700 border-b-[#1a1a1a] bg-[#1a1a1a] ${isFocused ? 'border-t-primary' : ''} ${index === 0 ? 'border-l-0' : ''}`
                      : 'border-b border-b-neutral-700 bg-neutral-800/40'
                  }`}
                >
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameSession(session.id, editValue)
                        setEditingSessionId(null)
                      }
                      if (e.key === 'Escape') setEditingSessionId(null)
                    }}
                    onBlur={() => {
                      renameSession(session.id, editValue)
                      setEditingSessionId(null)
                    }}
                    className="text-xs text-neutral-200 bg-transparent border-none outline-none w-[100px]"
                  />
                </div>
              )
            }

            return (
              <button
                key={session.id}
                ref={isActive ? activeTabRef as React.Ref<HTMLButtonElement> : undefined}
                draggable
                onDragStart={(e) => handleTabDragStart(e, session.id)}
                onDragEnd={handleTabDragEnd}
                onDragOver={(e) => handleTabDragOver(e, index)}
                onDragLeave={() => { if (tabDropIndex === index) setTabDropIndex(null) }}
                onDrop={(e) => handleTabDrop(e, index)}
                onClick={(e) => {
                  e.stopPropagation()
                  onSetActiveSession(session.id)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingSessionId(session.id)
                  setEditValue(session.name)
                }}
                className={`group relative flex items-center gap-1.5 px-3 shrink-0 text-xs transition-colors ${
                  isDragged ? 'opacity-50' : ''
                } ${
                  isActive
                    ? `border border-neutral-700 border-b-[#1a1a1a] bg-[#1a1a1a] text-neutral-200 ${isFocused ? 'border-t-primary' : ''} ${index === 0 ? 'border-l-0' : ''}`
                    : 'border-b border-b-neutral-700 text-neutral-500 hover:text-neutral-400 hover:bg-neutral-800/40'
                }`}
              >
                {renderTabDropIndicator(index, tabDropSide)}
                {session.claudeSessionId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                )}
                <span className="truncate max-w-[120px]">{session.name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseSession(session.id)
                  }}
                  className="p-0.5 rounded hover:bg-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={8} />
                </span>
              </button>
            )
          })}
        </div>

        {/* Spacer — fills remaining width with border-b, also a drop target */}
        <div
          className="flex-1 border-b border-b-neutral-700"
          onDragOver={handleSpacerDragOver}
          onDragLeave={handleSpacerDragLeave}
          onDrop={handleSpacerDrop}
        />

        {/* Actions area */}
        <div className="flex items-center gap-0.5 px-1 shrink-0 border-b border-b-neutral-700">
          {/* Split button: [+] [▾] */}
          <div className="flex items-center">
            <Tooltip content={t('pane.newTab')} side="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateSession()
                }}
                className="flex items-center justify-center w-5 h-6 rounded-l text-neutral-500
                           hover:text-neutral-300 hover:bg-neutral-700/50 transition-colors"
              >
                <Plus size={12} />
              </button>
            </Tooltip>
            <Tooltip content={t('pane.newSessionOptions')} side="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  setContextMenuAnchor(rect)
                  setShowContextMenu((v) => !v)
                }}
                className="flex items-center justify-center w-4 h-6 rounded-r text-neutral-500
                           hover:text-neutral-300 hover:bg-neutral-700/50 transition-colors"
              >
                <ChevronDown size={8} />
              </button>
            </Tooltip>
          </div>
          <div className="w-px h-3.5 bg-neutral-700/50 mx-0.5" />
          <Tooltip content={t('pane.splitRight')} side="bottom">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSplit('horizontal')
              }}
              className="flex items-center justify-center w-6 h-6 rounded text-neutral-500
                         hover:text-neutral-300 hover:bg-neutral-700/50 transition-colors"
            >
              <Columns2 size={12} />
            </button>
          </Tooltip>
          <Tooltip content={t('pane.splitDown')} side="bottom">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSplit('vertical')
              }}
              className="flex items-center justify-center w-6 h-6 rounded text-neutral-500
                         hover:text-neutral-300 hover:bg-neutral-700/50 transition-colors"
            >
              <Rows2 size={12} />
            </button>
          </Tooltip>
          <div className="w-px h-3.5 bg-neutral-700/50 mx-0.5" />
          {/* TODO toggle */}
          <Tooltip content={t('pane.toggleTodo')} side="bottom">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTodo((v) => !v)
              }}
              className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                showTodo
                  ? 'text-primary bg-neutral-700/50'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50'
              }`}
            >
              <SquareCheckBig size={12} />
            </button>
          </Tooltip>
          {isSplit && <div className="w-px h-3.5 bg-neutral-700/50 mx-0.5" />}
          {isSplit && onMinimize && (
            <Tooltip content={t('pane.minimizePane')} side="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMinimize()
                }}
                className="flex items-center justify-center w-6 h-6 rounded text-neutral-500
                           hover:text-yellow-400 hover:bg-neutral-700/50 transition-colors"
              >
                <Minus size={10} />
              </button>
            </Tooltip>
          )}
          {isSplit && (
            <Tooltip content={t('pane.closePane')} side="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClosePane()
                }}
                className="flex items-center justify-center w-6 h-6 rounded text-neutral-500
                           hover:text-red-400 hover:bg-neutral-700/50 transition-colors"
              >
                <X size={10} />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Custom overlay scrollbar */}
        {showScrollbar && (
          <div
            className="absolute bottom-0 left-0 h-[3px] z-10"
            style={{ width: scrollInfo.clientWidth }}
          >
            <div
              className="absolute h-full rounded-full bg-white/20 hover:bg-white/40 transition-colors"
              style={thumbStyle}
              onMouseDown={handleThumbMouseDown}
            />
          </div>
        )}
      </div>

      {/* Content area: terminal + optional TODO panel */}
      <div className="flex-1 flex min-h-0">
        {/* Terminal with drop zone overlay */}
        <div
          ref={contentRef}
          className="flex-1 relative min-w-0 bg-[#1a1a1a]"
        >
          {paneSessions.map((session) => (
            <div
              key={session.id}
              className="absolute inset-0"
              style={{ display: session.id === pane.activeSessionId ? 'block' : 'none' }}
            >
              <TerminalPane sessionId={session.id} />
            </div>
          ))}

          {/* Transparent drag-capture overlay — sits above xterm canvas to reliably receive drag events */}
          {showDragOverlay && (
            <div
              className="absolute inset-0 z-10"
              onDragOver={handleOverlayDragOver}
              onDragLeave={handleOverlayDragLeave}
              onDrop={handleOverlayDrop}
            />
          )}

          {renderDropOverlay()}
        </div>

        {/* Per-pane TODO panel */}
        {showTodo && (
          activeSessionId ? (
            <TodoPanel sessionId={activeSessionId} />
          ) : (
            <div className="w-64 h-full bg-neutral-900 border-l border-neutral-700/50 flex items-center justify-center">
              <p className="text-xs text-neutral-500">{t('pane.noActiveSession')}</p>
            </div>
          )
        )}
      </div>

      {/* Session context menu */}
      {showContextMenu && contextMenuAnchor && (
        <SessionContextMenu
          anchor={contextMenuAnchor}
          onClose={() => setShowContextMenu(false)}
          onSelectClaude={() => onCreateSessionWithCommand?.('claude\n')}
          onSelectClaudeDangerously={() => onCreateSessionWithCommand?.('claude --dangerously-skip-permissions\n')}
          onSelectWorktree={() => setShowWorktreeDialog(true)}
          resumableSessions={resumeHistory.map((entry) => ({
              id: entry.claudeSessionId,
              claudeSessionId: entry.claudeSessionId,
              claudeLastTitle: entry.claudeLastTitle,
              name: entry.sessionName,
            }))}
          onResume={(claudeSessionId) =>
            onCreateSessionWithCommand?.(`claude --resume ${claudeSessionId}\n`)
          }
        />
      )}

      {/* Worktree branch dialog */}
      {showWorktreeDialog && (
        <WorktreeBranchDialog
          onConfirm={(branchName) => {
            setShowWorktreeDialog(false)
            onCreateWorktreeSession?.(branchName)
          }}
          onCancel={() => setShowWorktreeDialog(false)}
        />
      )}
    </div>
  )
}
