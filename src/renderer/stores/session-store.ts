import { create } from 'zustand'
import { sessionService } from '@renderer/services/session-service'
import type { Session, Pane, SplitNode, SplitDirection, ClaudeSessionEvent, ClaudeActivity } from '@renderer/types/project'
import { splitPaneNode, splitPaneNodeAt, removePane, getPaneIds, updateRatioAtPath } from '@renderer/utils/split-utils'

interface SessionState {
  sessions: Session[]
  panes: Pane[]
  splitLayout: SplitNode | null
  focusedPaneId: string | null
  claudeActivities: Record<string, ClaudeActivity>

  loadSessions: (projectId: string) => Promise<void>

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

  // Claude session binding
  handleClaudeSessionEvent: (event: ClaudeSessionEvent) => void

  // Claude activity tracking
  updateClaudeActivity: (sessionId: string, activity: ClaudeActivity | null) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  panes: [],
  splitLayout: null,
  focusedPaneId: null,
  claudeActivities: {},

  loadSessions: async (projectId: string) => {
    const diskSessions = await sessionService.list(projectId)
    const currentSessions = get().sessions

    // Preserve in-memory claude bindings that may not yet be on disk
    const sessions = diskSessions.map((ds) => {
      const current = currentSessions.find((cs) => cs.id === ds.id)
      if (current?.claudeSessionId && !ds.claudeSessionId) {
        return { ...ds, claudeSessionId: current.claudeSessionId, claudeModel: current.claudeModel }
      }
      return ds
    })

    const activeSessions = sessions.filter((s) => s.status === 'active')

    if (activeSessions.length === 0) {
      set({ sessions, panes: [], splitLayout: null, focusedPaneId: null })
      return
    }

    // Create one pane with all active sessions as tabs
    const paneId = crypto.randomUUID()
    const pane: Pane = {
      id: paneId,
      sessionIds: activeSessions.map((s) => s.id),
      activeSessionId: activeSessions[0]?.id ?? null,
    }
    set({
      sessions,
      panes: [pane],
      splitLayout: { type: 'leaf', paneId },
      focusedPaneId: paneId,
    })
  },

  reorderSession: (paneId, sessionId, toIndex) => {
    const newPanes = get().panes.map((p) => {
      if (p.id !== paneId) return p
      const ids = p.sessionIds.filter((id) => id !== sessionId)
      ids.splice(toIndex, 0, sessionId)
      return { ...p, sessionIds: ids }
    })
    set({ panes: newPanes })
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

      let focusedPaneId = get().focusedPaneId
      if (focusedPaneId === sourcePaneId) focusedPaneId = targetPaneId

      set({ panes, splitLayout: layout, focusedPaneId })
    } else {
      set({ panes, focusedPaneId: targetPaneId })
    }
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
  },

  createFirstSession: async (projectId, cwd) => {
    const session = await sessionService.create(projectId, cwd)
    const paneId = crypto.randomUUID()
    const pane: Pane = {
      id: paneId,
      sessionIds: [session.id],
      activeSessionId: session.id,
    }
    set({
      sessions: [...get().sessions, session],
      panes: [pane],
      splitLayout: { type: 'leaf', paneId },
      focusedPaneId: paneId,
    })
  },

  createSessionInPane: async (paneId, projectId, cwd) => {
    const session = await sessionService.create(projectId, cwd)
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
  },

  closeSessionInPane: async (paneId, sessionId) => {
    await sessionService.close(sessionId)
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

      let focusedPaneId = get().focusedPaneId
      if (focusedPaneId && emptyPaneIds.includes(focusedPaneId)) {
        focusedPaneId = newPanes[0]?.id ?? null
      }

      set({ sessions, panes: newPanes, splitLayout: layout, focusedPaneId })
    } else {
      set({ sessions, panes: newPanes })
    }
  },

  setActiveSessionInPane: (paneId, sessionId) => {
    const newPanes = get().panes.map((p) => {
      if (p.id !== paneId) return p
      return { ...p, activeSessionId: sessionId }
    })
    set({ panes: newPanes, focusedPaneId: paneId })
  },

  splitPane: async (direction, projectId, cwd) => {
    const { focusedPaneId, splitLayout } = get()
    if (!focusedPaneId || !splitLayout) return

    const session = await sessionService.create(projectId, cwd)
    const newPaneId = crypto.randomUUID()
    const newPane: Pane = {
      id: newPaneId,
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
  },

  closePane: async (paneId) => {
    const pane = get().panes.find((p) => p.id === paneId)
    if (!pane) return

    for (const sid of pane.sessionIds) {
      await sessionService.close(sid)
    }

    const closedSet = new Set(pane.sessionIds)
    const sessions = get().sessions.filter((s) => !closedSet.has(s.id))
    const panes = get().panes.filter((p) => p.id !== paneId)

    let layout = get().splitLayout
    layout = layout ? removePane(layout, paneId) : null

    let focusedPaneId = get().focusedPaneId
    if (focusedPaneId === paneId) {
      focusedPaneId = panes[0]?.id ?? null
    }

    set({ sessions, panes, splitLayout: layout, focusedPaneId })
  },

  focusPane: (paneId) => {
    set({ focusedPaneId: paneId })
  },

  updateSplitRatio: (path, ratio) => {
    const layout = get().splitLayout
    if (!layout) return
    set({ splitLayout: updateRatioAtPath(layout, path, ratio) })
  },

  handleClaudeSessionEvent: (event) => {
    if (event.source === 'stop') {
      // SessionEnd — Claude session terminated, clear binding and activity
      const sessions = get().sessions.map((s) =>
        s.id === event.wsidnSessionId
          ? { ...s, claudeSessionId: null, claudeModel: null }
          : s
      )
      const { [event.wsidnSessionId]: _, ...restActivities } = get().claudeActivities
      set({ sessions, claudeActivities: restActivities })
      return
    }

    // Ignore start events without a valid Claude session ID
    if (!event.claudeSessionId) return

    const sessions = get().sessions.map((s) =>
      s.id === event.wsidnSessionId
        ? { ...s, claudeSessionId: event.claudeSessionId, claudeModel: event.model }
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
}))
