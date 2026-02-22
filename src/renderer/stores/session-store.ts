import { create } from 'zustand'
import { sessionService } from '@renderer/services/session-service'
import { mindtreeService } from '@renderer/services/mindtree-service'
import type {
  Session,
  Pane,
  SplitNode,
  SplitDirection,
  ClaudeSessionEvent,
  ClaudeActivity,
  ResumeHistoryEntry,
  WorkspaceState,
  WorkspaceStateV1,
  MinimizedPaneV1,
} from '@renderer/types/project'
import {
  splitPaneNode,
  splitPaneNodeAt,
  removePane,
  getPaneIds,
  updateRatioAtPath,
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

function _createSessionObject(projectId: string, cwd: string, nameOverride?: string, worktreeName?: string | null): Session {
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
    worktreeName: worktreeName ?? null,
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
    version: 2,
    panes: state.panes,
    splitLayout: state.splitLayout,
    focusedPaneId: state.focusedPaneId,
    minimizedPaneIds: state.minimizedPaneIds,
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
  minimizedPaneIds: string[]
  resumeHistory: ResumeHistoryEntry[]
  // Session Manager enabled state (runtime only, per WSIDN session UUID)
  sessionManagerEnabled: Record<string, boolean>

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
  handleClaudeSessionEvent: (event: ClaudeSessionEvent) => Promise<void>

  // Claude activity tracking
  updateClaudeActivity: (sessionId: string, activity: ClaudeActivity | null) => void
  updateClaudeLastTitle: (sessionId: string, title: string) => void

  // Session rename
  renameSession: (sessionId: string, name: string) => void

  // Session creation with command
  createSessionInPaneWithCommand: (paneId: string, projectId: string, cwd: string, command: string) => Promise<void>
  createWorktreeSessionInPane: (paneId: string, projectId: string, cwd: string, name: string) => Promise<void>

  // Session Manager
  toggleSessionManager: (wsidnSessionId: string, projectId: string, cwd: string, claudeSessionId: string | null) => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  panes: [],
  splitLayout: null,
  focusedPaneId: null,
  claudeActivities: {},
  minimizedPaneIds: [],
  resumeHistory: [],
  sessionManagerEnabled: {},

  loadSessions: async (projectId: string, cwd: string) => {
    _currentProjectId = projectId
    _nextSessionNumber = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let raw: any = null
    try {
      raw = await sessionService.loadWorkspace(projectId)
    } catch {
      // ignore — fall through to default
    }

    // Detect v1 and migrate to v2
    let workspace: WorkspaceState | null = null
    if (raw && raw.version === 1 && raw.panes?.length > 0) {
      const v1 = raw as WorkspaceStateV1
      let layout = v1.splitLayout
      const minimizedEntries: MinimizedPaneV1[] = v1.minimizedPanes ?? []
      const migratedMinimizedIds: string[] = []

      // Re-insert minimized panes into the tree (they were removed in v1)
      for (const entry of minimizedEntries) {
        migratedMinimizedIds.push(entry.paneId)
        if (!layout) {
          layout = { type: 'leaf', paneId: entry.paneId }
        } else if (entry.siblingPaneId && getPaneIds(layout).includes(entry.siblingPaneId)) {
          layout = splitPaneNodeAt(layout, entry.siblingPaneId, entry.paneId, entry.direction, entry.paneWasFirst)
        } else {
          const leaf: SplitNode = { type: 'leaf', paneId: entry.paneId }
          layout = {
            type: 'branch',
            direction: entry.direction,
            ratio: 0.5,
            first: entry.paneWasFirst ? leaf : layout,
            second: entry.paneWasFirst ? layout : leaf,
          }
        }
      }

      workspace = {
        version: 2,
        panes: v1.panes,
        splitLayout: layout,
        focusedPaneId: v1.focusedPaneId,
        minimizedPaneIds: migratedMinimizedIds,
      }
    } else if (raw && raw.version === 2 && raw.panes?.length > 0) {
      workspace = raw as WorkspaceState
    }

    if (workspace && workspace.panes.length > 0) {
      // Restore pane layout — create a fresh session for every pane
      const sessions: Session[] = []
      const minimizedSet = new Set(workspace.minimizedPaneIds)

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

      // Validate layout: all pane IDs in tree must exist in panes
      let layout = workspace.splitLayout
      if (layout) {
        const layoutPaneIds = new Set(getPaneIds(layout))
        const knownPaneIds = new Set(panes.map((p) => p.id))
        const allValid = [...layoutPaneIds].every((id) => knownPaneIds.has(id))
        if (!allValid) {
          // Fallback: single leaf with first pane
          layout = { type: 'leaf', paneId: panes[0].id }
        }
      } else {
        layout = { type: 'leaf', paneId: panes[0].id }
      }

      // Focus: prefer saved, fallback to first non-minimized pane
      let focusedPaneId = workspace.focusedPaneId
      const nonMinimizedIds = panes.filter((p) => !minimizedSet.has(p.id)).map((p) => p.id)
      if (!focusedPaneId || minimizedSet.has(focusedPaneId)) {
        focusedPaneId = nonMinimizedIds[0] ?? panes[0]?.id ?? null
      }

      set({
        sessions,
        panes,
        splitLayout: layout,
        focusedPaneId,
        minimizedPaneIds: workspace.minimizedPaneIds,
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
        minimizedPaneIds: [],
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
      // Also remove from minimizedPaneIds if it was there
      const minimizedPaneIds = get().minimizedPaneIds.filter((id) => id !== sourcePaneId)

      let focusedPaneId = get().focusedPaneId
      if (focusedPaneId === sourcePaneId) focusedPaneId = targetPaneId

      set({ panes, splitLayout: layout, focusedPaneId, minimizedPaneIds })
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
      // Also clean up minimizedPaneIds
      const minimizedPaneIds = get().minimizedPaneIds.filter((id) => !emptyPaneIds.includes(id))

      let focusedPaneId = get().focusedPaneId
      if (focusedPaneId && emptyPaneIds.includes(focusedPaneId)) {
        focusedPaneId = newPanes[0]?.id ?? null
      }

      set({ sessions, panes: newPanes, splitLayout: layout, focusedPaneId, minimizedPaneIds })
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
    const minimizedPaneIds = get().minimizedPaneIds.filter((id) => id !== paneId)

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

    set({ sessions, panes, splitLayout: layout, focusedPaneId, minimizedPaneIds, claudeActivities })
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
    const { minimizedPaneIds, focusedPaneId, splitLayout } = get()
    if (minimizedPaneIds.includes(paneId)) return

    const newMinimized = [...minimizedPaneIds, paneId]

    // Move focus away from the minimized pane
    let newFocus = focusedPaneId
    if (focusedPaneId === paneId) {
      const allIds = splitLayout ? getPaneIds(splitLayout) : []
      const mSet = new Set(newMinimized)
      newFocus = allIds.find((id) => !mSet.has(id)) ?? null
    }

    set({ minimizedPaneIds: newMinimized, focusedPaneId: newFocus })
    _scheduleSave()
  },

  restorePane: (paneId) => {
    const { minimizedPaneIds } = get()
    if (!minimizedPaneIds.includes(paneId)) return

    set({
      minimizedPaneIds: minimizedPaneIds.filter((id) => id !== paneId),
      focusedPaneId: paneId,
    })
    _scheduleSave()
  },

  handleClaudeSessionEvent: async (event) => {
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

    // Copy Mind Tree from previous session on clear/startup
    if (
      (event.source === 'clear' || event.source === 'startup') &&
      _currentProjectId
    ) {
      const session = get().sessions.find((s) => s.id === event.wsidnSessionId)
      const prevId = session?.claudeSessionId ?? session?.lastClaudeSessionId
      if (prevId && prevId !== event.claudeSessionId) {
        await mindtreeService.copy(_currentProjectId, prevId, event.claudeSessionId).catch(() => {})
      }
    }

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

  createWorktreeSessionInPane: async (paneId, projectId, cwd, name) => {
    const session = _createSessionObject(projectId, cwd, `WT: ${name}`, name)
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
        setTimeout(() => {
          sessionService.terminalInput(session.id, `claude -w "${name}"\n`)
        }, 100)
      }
    })
  },

  toggleSessionManager: async (wsidnSessionId, projectId, cwd, claudeSessionId) => {
    const current = get().sessionManagerEnabled[wsidnSessionId] ?? false
    const next = !current
    set((s) => ({
      sessionManagerEnabled: { ...s.sessionManagerEnabled, [wsidnSessionId]: next },
    }))
    await sessionService.sessionManagerSetEnabled(wsidnSessionId, next, {
      projectId,
      cwd,
      claudeSessionId,
    })
  },
}))
