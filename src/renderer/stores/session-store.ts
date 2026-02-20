import { create } from 'zustand'
import { sessionService } from '@renderer/services/session-service'
import type {
  Session,
  Pane,
  SplitNode,
  SplitDirection,
  ClaudeSessionEvent,
  ClaudeActivity,
  ResumeHistoryEntry,
  MinimizedPane,
  WorkspaceState
} from '@renderer/types/project'
import {
  splitPaneNode,
  splitPaneNodeAt,
  removePane,
  getPaneIds,
  updateRatioAtPath,
  findPanePosition
} from '@renderer/utils/split-utils'

// --- Runtime session counter (resets on app restart) ---

let _nextSessionNumber = 1

// --- Pane name helper ---

function nextPaneName(existingPanes: Pane[]): string {
  const usedNumbers = new Set<number>()
  for (const p of existingPanes) {
    const m = /^Pane (\d+)$/.exec(p.name)
    if (m) usedNumbers.add(Number(m[1]))
  }
  let n = 1
  while (usedNumbers.has(n)) n++
  return `Pane ${n}`
}

// --- Internal session factory (renderer-only, no IPC) ---

function _createSessionObject(projectId: string, cwd: string, nameOverride?: string): Session {
  return {
    id: crypto.randomUUID(),
    projectId,
    name: nameOverride ?? `Session ${_nextSessionNumber++}`,
    cwd,
    createdAt: new Date().toISOString(),
    claudeSessionId: null,
    claudeModel: null,
    claudeLastTitle: null,
    lastClaudeSessionId: null,
  }
}

// --- Debounced workspace save ---

let _saveTimer: ReturnType<typeof setTimeout> | null = null
let _currentProjectId: string | null = null

function _scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    _flushSave()
  }, 500)
}

function _flushSave() {
  if (_saveTimer) {
    clearTimeout(_saveTimer)
    _saveTimer = null
  }
  const projectId = _currentProjectId
  if (!projectId) return

  const state = useSessionStore.getState()
  const workspace: WorkspaceState = {
    version: 1,
    panes: state.panes,
    splitLayout: state.splitLayout,
    focusedPaneId: state.focusedPaneId,
    minimizedPanes: state.minimizedPanes,
  }
  sessionService.saveWorkspace(projectId, workspace).catch(() => {})
}

function _flushResumeHistory() {
  const projectId = _currentProjectId
  if (!projectId) return

  const state = useSessionStore.getState()
  for (const session of state.sessions) {
    const claudeId = session.lastClaudeSessionId ?? session.claudeSessionId
    if (claudeId) {
      // Use synchronous IPC to ensure write completes before app exit
      window.wsidn.resumeHistory.appendSync(projectId, {
        claudeSessionId: claudeId,
        sessionName: session.name,
        claudeLastTitle: session.claudeLastTitle ?? null,
        closedAt: new Date().toISOString(),
      })
    }
  }
}

// beforeunload flush
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    _flushSave()
    _flushResumeHistory()
  })
}

interface SessionState {
  sessions: Session[]
  panes: Pane[]
  splitLayout: SplitNode | null
  focusedPaneId: string | null
  claudeActivities: Record<string, ClaudeActivity>
  minimizedPanes: MinimizedPane[]
  resumeHistory: ResumeHistoryEntry[]

  loadSessions: (projectId: string, cwd: string) => Promise<void>

  // Session management within panes
  createSessionInPane: (paneId: string, projectId: string, cwd: string) => Promise<void>
  closeSessionInPane: (paneId: string, sessionId: string) => Promise<void>
  setActiveSessionInPane: (paneId: string, sessionId: string) => void

  // Drag and drop
  reorderSession: (paneId: string, sessionId: string, toIndex: number) => void
  moveSessionToPane: (sessionId: string, sourcePaneId: string, targetPaneId: string, toIndex: number) => void
  moveSessionToNewSplit: (sessionId: string, sourcePaneId: string, targetPaneId: string, direction: SplitDirection, newPaneFirst: boolean) => void

  // Pane management
  createFirstSession: (projectId: string, cwd: string) => Promise<void>
  splitPane: (direction: SplitDirection, projectId: string, cwd: string) => Promise<void>
  closePane: (paneId: string) => Promise<void>
  focusPane: (paneId: string) => void
  updateSplitRatio: (path: string, ratio: number) => void
  renamePane: (paneId: string, name: string) => void

  // Minimize / restore
  minimizePane: (paneId: string) => void
  restorePane: (paneId: string) => void

  // Claude session binding
  handleClaudeSessionEvent: (event: ClaudeSessionEvent) => void

  // Claude activity tracking
  updateClaudeActivity: (sessionId: string, activity: ClaudeActivity | null) => void
  updateClaudeLastTitle: (sessionId: string, title: string) => void

  // Session rename
  renameSession: (sessionId: string, name: string) => void

  // Session creation with command
  createSessionInPaneWithCommand: (paneId: string, projectId: string, cwd: string, command: string) => Promise<void>
  createWorktreeSessionInPane: (paneId: string, projectId: string, cwd: string, branchName: string) => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  panes: [],
  splitLayout: null,
  focusedPaneId: null,
  claudeActivities: {},
  minimizedPanes: [],
  resumeHistory: [],

  loadSessions: async (projectId: string, cwd: string) => {
    _currentProjectId = projectId
    _nextSessionNumber = 1

    let workspace: WorkspaceState | null = null
    try {
      workspace = await sessionService.loadWorkspace(projectId)
    } catch {
      // ignore — fall through to default
    }

    if (workspace && workspace.version === 1 && workspace.panes.length > 0) {
      // Restore pane layout — create a fresh session for every pane (visible + minimized)
      const sessions: Session[] = []
      const minimizedPaneIds = new Set((workspace.minimizedPanes ?? []).map((m) => m.paneId))

      const panes: Pane[] = []
      for (const p of workspace.panes) {
        const session = _createSessionObject(projectId, cwd)
        sessions.push(session)
        panes.push({
          ...p,
          sessionIds: [session.id],
          activeSessionId: session.id,
        })
      }

      // Layout: minimized panes are already not in the split tree, keep as-is
      let layout = workspace.splitLayout

      // Validate layout contains only existing visible pane ids
      if (layout) {
        const layoutPaneIds = new Set(getPaneIds(layout))
        const visiblePanes = panes.filter((p) => !minimizedPaneIds.has(p.id))
        const validPanes = visiblePanes.filter((p) => layoutPaneIds.has(p.id))
        if (validPanes.length === 0 && visiblePanes.length > 0) {
          layout = { type: 'leaf', paneId: visiblePanes[0].id }
        }
      } else {
        const visiblePanes = panes.filter((p) => !minimizedPaneIds.has(p.id))
        if (visiblePanes.length > 0) {
          layout = { type: 'leaf', paneId: visiblePanes[0].id }
        }
      }

      const minimizedPanes = workspace.minimizedPanes ?? []

      let focusedPaneId = workspace.focusedPaneId
      const visiblePaneIds = new Set(
        panes.filter((p) => !minimizedPaneIds.has(p.id)).map((p) => p.id)
      )
      if (!focusedPaneId || !visiblePaneIds.has(focusedPaneId)) {
        focusedPaneId = [...visiblePaneIds][0] ?? null
      }

      set({
        sessions,
        panes,
        splitLayout: layout,
        focusedPaneId,
        minimizedPanes,
      })

      // Spawn PTY for each session
      for (const session of sessions) {
        sessionService.spawn(session.id, cwd).catch(() => {})
      }
    } else {
      // No workspace — start with empty state
      set({
        sessions: [],
        panes: [],
        splitLayout: null,
        focusedPaneId: null,
        minimizedPanes: [],
      })
    }

    _scheduleSave()

    // Load resume history from disk (also triggers legacy migration)
    try {
      const history = await sessionService.listResumeHistory(projectId)
      set({ resumeHistory: history })
    } catch {
      set({ resumeHistory: [] })
    }
  },

  reorderSession: (paneId, sessionId, toIndex) => {
    const newPanes = get().panes.map((p) => {
      if (p.id !== paneId) return p
      const ids = p.sessionIds.filter((id) => id !== sessionId)
      ids.splice(toIndex, 0, sessionId)
      return { ...p, sessionIds: ids }
    })
    set({ panes: newPanes })
    _scheduleSave()
  },

  moveSessionToPane: (sessionId, sourcePaneId, targetPaneId, toIndex) => {
    let panes = get().panes.map((p) => {
      if (p.id === sourcePaneId) {
        const newSessionIds = p.sessionIds.filter((id) => id !== sessionId)
        const newActive =
          p.activeSessionId === sessionId ? (newSessionIds.at(-1) ?? null) : p.activeSessionId
        return { ...p, sessionIds: newSessionIds, activeSessionId: newActive }
      }
      if (p.id === targetPaneId) {
        const ids = p.sessionIds.filter((id) => id !== sessionId)
        ids.splice(toIndex, 0, sessionId)
        return { ...p, sessionIds: ids, activeSessionId: sessionId }
      }
      return p
    })

    // Clean up empty source pane
    const emptyPane = panes.find((p) => p.id === sourcePaneId && p.sessionIds.length === 0)
    if (emptyPane) {
      let layout = get().splitLayout
      layout = layout ? removePane(layout, sourcePaneId) : null
      panes = panes.filter((p) => p.sessionIds.length > 0)
      // Also remove from minimizedPanes if it was there
      const minimizedPanes = get().minimizedPanes.filter((m) => m.paneId !== sourcePaneId)

      let focusedPaneId = get().focusedPaneId
      if (focusedPaneId === sourcePaneId) focusedPaneId = targetPaneId

      set({ panes, splitLayout: layout, focusedPaneId, minimizedPanes })
    } else {
      set({ panes, focusedPaneId: targetPaneId })
    }
    _scheduleSave()
  },

  moveSessionToNewSplit: (sessionId, sourcePaneId, targetPaneId, direction, newPaneFirst) => {
    // Remove session from source pane
    let panes = get().panes.map((p) => {
      if (p.id !== sourcePaneId) return p
      const newSessionIds = p.sessionIds.filter((id) => id !== sessionId)
      const newActive =
        p.activeSessionId === sessionId ? (newSessionIds.at(-1) ?? null) : p.activeSessionId
      return { ...p, sessionIds: newSessionIds, activeSessionId: newActive }
    })

    // Clean up empty source pane from layout first
    let layout = get().splitLayout
    const emptyPane = panes.find((p) => p.id === sourcePaneId && p.sessionIds.length === 0)
    if (emptyPane) {
      layout = layout ? removePane(layout, sourcePaneId) : null
      panes = panes.filter((p) => p.sessionIds.length > 0)
    }

    // Create new pane
    const newPaneId = crypto.randomUUID()
    const newPane: Pane = {
      id: newPaneId,
      name: nextPaneName([...panes]),
      sessionIds: [sessionId],
      activeSessionId: sessionId,
    }

    // Insert into layout next to target
    if (layout) {
      layout = splitPaneNodeAt(layout, targetPaneId, newPaneId, direction, newPaneFirst)
    }

    set({
      panes: [...panes, newPane],
      splitLayout: layout,
      focusedPaneId: newPaneId,
    })
    _scheduleSave()
  },

  createFirstSession: async (projectId, cwd) => {
    const session = _createSessionObject(projectId, cwd)
    await sessionService.spawn(session.id, cwd)

    const paneId = crypto.randomUUID()
    const pane: Pane = {
      id: paneId,
      name: 'Pane 1',
      sessionIds: [session.id],
      activeSessionId: session.id,
    }
    set({
      sessions: [...get().sessions, session],
      panes: [pane],
      splitLayout: { type: 'leaf', paneId },
      focusedPaneId: paneId,
    })
    _scheduleSave()
  },

  createSessionInPane: async (paneId, projectId, cwd) => {
    const session = _createSessionObject(projectId, cwd)
    await sessionService.spawn(session.id, cwd)

    const newPanes = get().panes.map((p) => {
      if (p.id !== paneId) return p
      return {
        ...p,
        sessionIds: [...p.sessionIds, session.id],
        activeSessionId: session.id,
      }
    })
    set({
      sessions: [...get().sessions, session],
      panes: newPanes,
      focusedPaneId: paneId,
    })
    _scheduleSave()
  },

  closeSessionInPane: async (paneId, sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId)
    const claudeId = session?.lastClaudeSessionId ?? session?.claudeSessionId

    // Update in-memory resume history immediately + persist to disk in background
    if (session && claudeId && _currentProjectId) {
      const entry: ResumeHistoryEntry = {
        claudeSessionId: claudeId,
        sessionName: session.name,
        claudeLastTitle: session.claudeLastTitle ?? null,
        closedAt: new Date().toISOString(),
      }
      const prev = get().resumeHistory.filter((e) => e.claudeSessionId !== claudeId)
      set({ resumeHistory: [...prev, entry] })
      sessionService.appendResumeHistory(_currentProjectId, entry).catch(() => {})
    }

    await sessionService.close(sessionId)

    // Remove session from memory
    const sessions = get().sessions.filter((s) => s.id !== sessionId)

    let newPanes = get().panes.map((p) => {
      if (p.id !== paneId) return p
      const newSessionIds = p.sessionIds.filter((id) => id !== sessionId)
      const newActive =
        p.activeSessionId === sessionId ? (newSessionIds.at(-1) ?? null) : p.activeSessionId
      return { ...p, sessionIds: newSessionIds, activeSessionId: newActive }
    })

    // Remove panes with no sessions
    const emptyPaneIds = newPanes.filter((p) => p.sessionIds.length === 0).map((p) => p.id)

    if (emptyPaneIds.length > 0) {
      let layout = get().splitLayout
      for (const epId of emptyPaneIds) {
        layout = layout ? removePane(layout, epId) : null
      }
      newPanes = newPanes.filter((p) => p.sessionIds.length > 0)
      // Also clean up minimizedPanes
      const minimizedPanes = get().minimizedPanes.filter((m) => !emptyPaneIds.includes(m.paneId))

      let focusedPaneId = get().focusedPaneId
      if (focusedPaneId && emptyPaneIds.includes(focusedPaneId)) {
        focusedPaneId = newPanes[0]?.id ?? null
      }

      set({ sessions, panes: newPanes, splitLayout: layout, focusedPaneId, minimizedPanes })
    } else {
      set({ sessions, panes: newPanes })
    }

    // Clean up claude activity
    const { [sessionId]: _, ...restActivities } = get().claudeActivities
    if (_ !== undefined) {
      set({ claudeActivities: restActivities })
    }

    _scheduleSave()
  },

  setActiveSessionInPane: (paneId, sessionId) => {
    const newPanes = get().panes.map((p) => {
      if (p.id !== paneId) return p
      return { ...p, activeSessionId: sessionId }
    })
    set({ panes: newPanes, focusedPaneId: paneId })
    _scheduleSave()
  },

  splitPane: async (direction, projectId, cwd) => {
    const { focusedPaneId, splitLayout } = get()
    if (!focusedPaneId || !splitLayout) return

    const session = _createSessionObject(projectId, cwd)
    await sessionService.spawn(session.id, cwd)

    const newPaneId = crypto.randomUUID()
    const newPane: Pane = {
      id: newPaneId,
      name: nextPaneName(get().panes),
      sessionIds: [session.id],
      activeSessionId: session.id,
    }

    const newLayout = splitPaneNode(splitLayout, focusedPaneId, newPaneId, direction)

    set({
      sessions: [...get().sessions, session],
      panes: [...get().panes, newPane],
      splitLayout: newLayout,
      focusedPaneId: newPaneId,
    })
    _scheduleSave()
  },

  closePane: async (paneId) => {
    const pane = get().panes.find((p) => p.id === paneId)
    if (!pane) return

    // Update in-memory resume history immediately + persist to disk in background
    let resumeHistory = get().resumeHistory
    for (const sid of pane.sessionIds) {
      const session = get().sessions.find((s) => s.id === sid)
      const claudeId = session?.lastClaudeSessionId ?? session?.claudeSessionId
      if (session && claudeId && _currentProjectId) {
        const entry: ResumeHistoryEntry = {
          claudeSessionId: claudeId,
          sessionName: session.name,
          claudeLastTitle: session.claudeLastTitle ?? null,
          closedAt: new Date().toISOString(),
        }
        resumeHistory = [...resumeHistory.filter((e) => e.claudeSessionId !== claudeId), entry]
        sessionService.appendResumeHistory(_currentProjectId, entry).catch(() => {})
      }
    }
    set({ resumeHistory })

    for (const sid of pane.sessionIds) {
      await sessionService.close(sid)
    }

    const closedSet = new Set(pane.sessionIds)
    const sessions = get().sessions.filter((s) => !closedSet.has(s.id))
    const panes = get().panes.filter((p) => p.id !== paneId)
    const minimizedPanes = get().minimizedPanes.filter((m) => m.paneId !== paneId)

    let layout = get().splitLayout
    layout = layout ? removePane(layout, paneId) : null

    let focusedPaneId = get().focusedPaneId
    if (focusedPaneId === paneId) {
      focusedPaneId = panes[0]?.id ?? null
    }

    // Clean up claude activities
    const claudeActivities = { ...get().claudeActivities }
    for (const sid of pane.sessionIds) {
      delete claudeActivities[sid]
    }

    set({ sessions, panes, splitLayout: layout, focusedPaneId, minimizedPanes, claudeActivities })
    _scheduleSave()
  },

  focusPane: (paneId) => {
    set({ focusedPaneId: paneId })
    _scheduleSave()
  },

  updateSplitRatio: (path, ratio) => {
    const layout = get().splitLayout
    if (!layout) return
    set({ splitLayout: updateRatioAtPath(layout, path, ratio) })
    _scheduleSave()
  },

  renamePane: (paneId, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const panes = get().panes.map((p) => (p.id === paneId ? { ...p, name: trimmed } : p))
    set({ panes })
    _scheduleSave()
  },

  minimizePane: (paneId) => {
    const { splitLayout, panes, minimizedPanes } = get()
    if (!splitLayout) return

    // Record position in tree
    const pos = findPanePosition(splitLayout, paneId)
    const entry: MinimizedPane = {
      paneId,
      siblingPaneId: pos?.siblingPaneId ?? null,
      direction: pos?.direction ?? 'horizontal',
      paneWasFirst: pos?.paneWasFirst ?? true,
    }

    // Remove from split tree
    const newLayout = removePane(splitLayout, paneId)

    // Update focusedPaneId if needed
    let focusedPaneId = get().focusedPaneId
    if (focusedPaneId === paneId) {
      const visibleIds = newLayout ? getPaneIds(newLayout) : []
      focusedPaneId = visibleIds[0] ?? null
    }

    set({
      splitLayout: newLayout,
      minimizedPanes: [...minimizedPanes, entry],
      focusedPaneId,
    })
    _scheduleSave()
  },

  restorePane: (paneId) => {
    const { splitLayout, panes, minimizedPanes } = get()
    const entry = minimizedPanes.find((m) => m.paneId === paneId)
    if (!entry) return

    const newMinimized = minimizedPanes.filter((m) => m.paneId !== paneId)
    let newLayout = splitLayout

    if (!newLayout) {
      // Tree is empty — set as root leaf
      newLayout = { type: 'leaf', paneId }
    } else if (
      entry.siblingPaneId &&
      getPaneIds(newLayout).includes(entry.siblingPaneId)
    ) {
      // Sibling still exists — insert next to it
      newLayout = splitPaneNodeAt(
        newLayout,
        entry.siblingPaneId,
        paneId,
        entry.direction,
        entry.paneWasFirst
      )
    } else {
      // Sibling gone — insert at root
      const rootLeaf: SplitNode = { type: 'leaf', paneId }
      newLayout = {
        type: 'branch',
        direction: entry.direction,
        ratio: 0.5,
        first: entry.paneWasFirst ? rootLeaf : newLayout,
        second: entry.paneWasFirst ? newLayout : rootLeaf,
      }
    }

    set({
      splitLayout: newLayout,
      minimizedPanes: newMinimized,
      focusedPaneId: paneId,
    })
    _scheduleSave()
  },

  handleClaudeSessionEvent: (event) => {
    if (event.source === 'stop') {
      // SessionEnd — Claude session terminated, preserve ID for resume, clear binding
      const session = get().sessions.find((s) => s.id === event.wsidnSessionId)
      const claudeId = session?.claudeSessionId ?? session?.lastClaudeSessionId

      const sessions = get().sessions.map((s) =>
        s.id === event.wsidnSessionId
          ? {
              ...s,
              lastClaudeSessionId: s.claudeSessionId ?? s.lastClaudeSessionId,
              claudeSessionId: null,
              claudeModel: null,
            }
          : s
      )
      const { [event.wsidnSessionId]: _, ...restActivities } = get().claudeActivities

      // Add resume entry immediately (memory + disk)
      if (session && claudeId && _currentProjectId) {
        const entry: ResumeHistoryEntry = {
          claudeSessionId: claudeId,
          sessionName: session.name,
          claudeLastTitle: session.claudeLastTitle ?? null,
          closedAt: new Date().toISOString(),
        }
        const prev = get().resumeHistory.filter((e) => e.claudeSessionId !== claudeId)
        set({ sessions, claudeActivities: restActivities, resumeHistory: [...prev, entry] })
        sessionService.appendResumeHistory(_currentProjectId, entry).catch(() => {})
      } else {
        set({ sessions, claudeActivities: restActivities })
      }
      return
    }

    // Ignore start events without a valid Claude session ID
    if (!event.claudeSessionId) return

    const sessions = get().sessions.map((s) =>
      s.id === event.wsidnSessionId
        ? {
            ...s,
            claudeSessionId: event.claudeSessionId,
            claudeModel: event.model,
            lastClaudeSessionId: event.claudeSessionId,
          }
        : s
    )
    set({ sessions })
  },

  updateClaudeActivity: (sessionId, activity) => {
    const prev = get().claudeActivities
    if (activity === null) {
      if (!(sessionId in prev)) return
      const { [sessionId]: _, ...rest } = prev
      set({ claudeActivities: rest })
    } else {
      set({ claudeActivities: { ...prev, [sessionId]: activity } })
    }
  },

  updateClaudeLastTitle: (sessionId, title) => {
    const sessions = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, claudeLastTitle: title } : s
    )
    set({ sessions })
  },

  renameSession: (sessionId, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const sessions = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, name: trimmed } : s
    )
    set({ sessions })
  },

  createSessionInPaneWithCommand: async (paneId, projectId, cwd, command) => {
    const session = _createSessionObject(projectId, cwd)
    await sessionService.spawn(session.id, cwd)

    const newPanes = get().panes.map((p) => {
      if (p.id !== paneId) return p
      return {
        ...p,
        sessionIds: [...p.sessionIds, session.id],
        activeSessionId: session.id,
      }
    })
    set({
      sessions: [...get().sessions, session],
      panes: newPanes,
      focusedPaneId: paneId,
    })
    _scheduleSave()
    // Wait for first PTY output (shell prompt ready) then send command
    const unsub = sessionService.onTerminalOutput((sid, _data) => {
      if (sid === session.id) {
        unsub()
        // Small extra delay to ensure prompt is fully rendered
        setTimeout(() => {
          sessionService.terminalInput(session.id, command)
        }, 100)
      }
    })
  },

  createWorktreeSessionInPane: async (paneId, projectId, cwd, branchName) => {
    const result = await sessionService.createWorktree(projectId, cwd, branchName)
    const { worktreePath, initScript } = result

    const session = _createSessionObject(projectId, worktreePath, `WT: ${branchName}`)
    await sessionService.spawn(session.id, worktreePath)

    const newPanes = get().panes.map((p) => {
      if (p.id !== paneId) return p
      return {
        ...p,
        sessionIds: [...p.sessionIds, session.id],
        activeSessionId: session.id,
      }
    })
    set({
      sessions: [...get().sessions, session],
      panes: newPanes,
      focusedPaneId: paneId,
    })
    _scheduleSave()
    // Wait for first PTY output (shell prompt ready) then send command
    const unsub = sessionService.onTerminalOutput((sid, _data) => {
      if (sid === session.id) {
        unsub()
        setTimeout(() => {
          const cmd = initScript ? `${initScript} && claude\n` : 'claude\n'
          sessionService.terminalInput(session.id, cmd)
        }, 100)
      }
    })
  },
}))
