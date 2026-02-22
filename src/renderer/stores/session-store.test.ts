import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set up window.wsidn mock before importing the store
const wsidnMock = {
  resumeHistory: {
    appendSync: vi.fn(),
  },
}
Object.defineProperty(globalThis, 'window', {
  value: { ...globalThis.window, wsidn: wsidnMock, addEventListener: vi.fn() },
  writable: true,
})

vi.mock('@renderer/services/session-service', () => ({
  sessionService: {
    spawn: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(true),
    loadWorkspace: vi.fn().mockResolvedValue(null),
    saveWorkspace: vi.fn().mockResolvedValue(true),
    listResumeHistory: vi.fn().mockResolvedValue([]),
    appendResumeHistory: vi.fn().mockResolvedValue(true),
    terminalInput: vi.fn(),
    onTerminalOutput: vi.fn(() => vi.fn()),
    sessionManagerSetEnabled: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('@renderer/services/mindtree-service', () => ({
  mindtreeService: {
    copy: vi.fn().mockResolvedValue(true),
  },
}))

import { useSessionStore } from './session-store'
import { sessionService } from '@renderer/services/session-service'
import { mindtreeService } from '@renderer/services/mindtree-service'
import type { Session, Pane, SplitNode, WorkspaceState } from '@renderer/types/project'

const PROJECT_ID = 'proj-1'
const CWD = '/test/cwd'

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    projectId: PROJECT_ID,
    name: 'Test Session',
    cwd: CWD,
    createdAt: '2025-01-01T00:00:00.000Z',
    claudeSessionId: null,
    claudeModel: null,
    claudeLastTitle: null,
    lastClaudeSessionId: null,
    worktreeName: null,
    ...overrides,
  }
}

function makePane(id: string, sessionIds: string[], activeSessionId?: string): Pane {
  return {
    id,
    name: `Pane`,
    sessionIds,
    activeSessionId: activeSessionId ?? sessionIds[0] ?? null,
  }
}

function leafNode(paneId: string): SplitNode {
  return { type: 'leaf', paneId }
}

beforeEach(() => {
  useSessionStore.setState({
    sessions: [],
    panes: [],
    splitLayout: null,
    focusedPaneId: null,
    claudeActivities: {},
    minimizedPaneIds: [],
    resumeHistory: [],
    sessionManagerEnabled: {},
  })
  vi.clearAllMocks()
  vi.useFakeTimers()
})

describe('session-store', () => {
  // ─── createFirstSession ───────────────────────────────────────────

  describe('createFirstSession', () => {
    it('creates session, pane, and layout leaf, sets focusedPaneId', async () => {
      await useSessionStore.getState().createFirstSession(PROJECT_ID, CWD)

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(1)
      expect(state.panes).toHaveLength(1)
      expect(state.panes[0].sessionIds).toContain(state.sessions[0].id)
      expect(state.splitLayout).toEqual({ type: 'leaf', paneId: state.panes[0].id })
      expect(state.focusedPaneId).toBe(state.panes[0].id)
      expect(sessionService.spawn).toHaveBeenCalledWith(state.sessions[0].id, CWD)
    })
  })

  // ─── createSessionInPane ──────────────────────────────────────────

  describe('createSessionInPane', () => {
    it('adds session to existing pane and sets as active', async () => {
      const s1 = makeSession({ id: 'sess-1' })
      const pane = makePane('pane-1', ['sess-1'])
      useSessionStore.setState({
        sessions: [s1],
        panes: [pane],
        splitLayout: leafNode('pane-1'),
        focusedPaneId: 'pane-1',
      })

      await useSessionStore.getState().createSessionInPane('pane-1', PROJECT_ID, CWD)

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(2)
      const newSession = state.sessions[1]
      expect(state.panes[0].sessionIds).toContain(newSession.id)
      expect(state.panes[0].activeSessionId).toBe(newSession.id)
      expect(sessionService.spawn).toHaveBeenCalledWith(newSession.id, CWD)
    })
  })

  // ─── closeSessionInPane ───────────────────────────────────────────

  describe('closeSessionInPane', () => {
    it('removes session and cleans up empty pane', async () => {
      const s1 = makeSession({ id: 'sess-1' })
      const pane = makePane('pane-1', ['sess-1'])
      useSessionStore.setState({
        sessions: [s1],
        panes: [pane],
        splitLayout: leafNode('pane-1'),
        focusedPaneId: 'pane-1',
      })

      await useSessionStore.getState().closeSessionInPane('pane-1', 'sess-1')

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(0)
      expect(state.panes).toHaveLength(0)
      expect(state.splitLayout).toBeNull()
      expect(sessionService.close).toHaveBeenCalledWith('sess-1')
    })

    it('keeps pane when other sessions remain', async () => {
      const s1 = makeSession({ id: 'sess-1' })
      const s2 = makeSession({ id: 'sess-2' })
      const pane = makePane('pane-1', ['sess-1', 'sess-2'], 'sess-1')
      useSessionStore.setState({
        sessions: [s1, s2],
        panes: [pane],
        splitLayout: leafNode('pane-1'),
        focusedPaneId: 'pane-1',
      })

      await useSessionStore.getState().closeSessionInPane('pane-1', 'sess-1')

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(1)
      expect(state.panes).toHaveLength(1)
      expect(state.panes[0].sessionIds).toEqual(['sess-2'])
      expect(state.panes[0].activeSessionId).toBe('sess-2')
    })

    it('updates resume history when closing a session with claude binding', async () => {
      const s1 = makeSession({ id: 'sess-1', claudeSessionId: 'claude-1', claudeLastTitle: 'Some task' })
      const pane = makePane('pane-1', ['sess-1'])
      useSessionStore.setState({
        sessions: [s1],
        panes: [pane],
        splitLayout: leafNode('pane-1'),
        focusedPaneId: 'pane-1',
      })

      // loadSessions sets _currentProjectId internally, simulate by calling it first
      vi.mocked(sessionService.loadWorkspace).mockResolvedValue(null)
      await useSessionStore.getState().loadSessions(PROJECT_ID, CWD)

      // Recreate state since loadSessions resets it
      const s1b = makeSession({ id: 'sess-1b', claudeSessionId: 'claude-1b', claudeLastTitle: 'Task' })
      const paneB = makePane('pane-b', ['sess-1b'])
      useSessionStore.setState({
        sessions: [s1b],
        panes: [paneB],
        splitLayout: leafNode('pane-b'),
        focusedPaneId: 'pane-b',
      })

      await useSessionStore.getState().closeSessionInPane('pane-b', 'sess-1b')

      expect(sessionService.appendResumeHistory).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({ claudeSessionId: 'claude-1b' })
      )
      const state = useSessionStore.getState()
      expect(state.resumeHistory.some((e) => e.claudeSessionId === 'claude-1b')).toBe(true)
    })
  })

  // ─── splitPane ────────────────────────────────────────────────────

  describe('splitPane', () => {
    it('creates new pane with session and splits layout tree', async () => {
      const s1 = makeSession({ id: 'sess-1' })
      const pane = makePane('pane-1', ['sess-1'])
      useSessionStore.setState({
        sessions: [s1],
        panes: [pane],
        splitLayout: leafNode('pane-1'),
        focusedPaneId: 'pane-1',
      })

      await useSessionStore.getState().splitPane('horizontal', PROJECT_ID, CWD)

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(2)
      expect(state.panes).toHaveLength(2)
      // Layout should be a branch now
      expect(state.splitLayout?.type).toBe('branch')
      if (state.splitLayout?.type === 'branch') {
        expect(state.splitLayout.direction).toBe('horizontal')
      }
      // Focus should move to new pane
      const newPaneId = state.panes[1].id
      expect(state.focusedPaneId).toBe(newPaneId)
    })
  })

  // ─── closePane ────────────────────────────────────────────────────

  describe('closePane', () => {
    it('closes all sessions in pane and removes from layout', async () => {
      const s1 = makeSession({ id: 'sess-1' })
      const s2 = makeSession({ id: 'sess-2' })
      const s3 = makeSession({ id: 'sess-3' })
      const pane1 = makePane('pane-1', ['sess-1', 'sess-2'])
      const pane2 = makePane('pane-2', ['sess-3'])
      const layout: SplitNode = {
        type: 'branch',
        direction: 'horizontal',
        ratio: 0.5,
        first: leafNode('pane-1'),
        second: leafNode('pane-2'),
      }
      useSessionStore.setState({
        sessions: [s1, s2, s3],
        panes: [pane1, pane2],
        splitLayout: layout,
        focusedPaneId: 'pane-1',
      })

      await useSessionStore.getState().closePane('pane-1')

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(1)
      expect(state.sessions[0].id).toBe('sess-3')
      expect(state.panes).toHaveLength(1)
      expect(state.panes[0].id).toBe('pane-2')
      expect(sessionService.close).toHaveBeenCalledWith('sess-1')
      expect(sessionService.close).toHaveBeenCalledWith('sess-2')
      // Focus should move to remaining pane
      expect(state.focusedPaneId).toBe('pane-2')
    })
  })

  // ─── moveSessionToPane ────────────────────────────────────────────

  describe('moveSessionToPane', () => {
    it('moves session between panes and auto-removes empty source pane', async () => {
      const s1 = makeSession({ id: 'sess-1' })
      const s2 = makeSession({ id: 'sess-2' })
      const pane1 = makePane('pane-1', ['sess-1'])
      const pane2 = makePane('pane-2', ['sess-2'])
      const layout: SplitNode = {
        type: 'branch',
        direction: 'horizontal',
        ratio: 0.5,
        first: leafNode('pane-1'),
        second: leafNode('pane-2'),
      }
      useSessionStore.setState({
        sessions: [s1, s2],
        panes: [pane1, pane2],
        splitLayout: layout,
        focusedPaneId: 'pane-1',
      })

      useSessionStore.getState().moveSessionToPane('sess-1', 'pane-1', 'pane-2', 0)

      const state = useSessionStore.getState()
      // Source pane had only 1 session and should be auto-removed
      expect(state.panes).toHaveLength(1)
      expect(state.panes[0].id).toBe('pane-2')
      expect(state.panes[0].sessionIds).toEqual(['sess-1', 'sess-2'])
      expect(state.panes[0].activeSessionId).toBe('sess-1')
      // Layout should collapse to leaf
      expect(state.splitLayout).toEqual(leafNode('pane-2'))
      // Focus should move to target pane
      expect(state.focusedPaneId).toBe('pane-2')
    })
  })

  // ─── minimizePane ─────────────────────────────────────────────────

  describe('minimizePane', () => {
    it('adds to minimizedPaneIds and moves focus away', () => {
      const s1 = makeSession({ id: 'sess-1' })
      const s2 = makeSession({ id: 'sess-2' })
      const pane1 = makePane('pane-1', ['sess-1'])
      const pane2 = makePane('pane-2', ['sess-2'])
      const layout: SplitNode = {
        type: 'branch',
        direction: 'horizontal',
        ratio: 0.5,
        first: leafNode('pane-1'),
        second: leafNode('pane-2'),
      }
      useSessionStore.setState({
        sessions: [s1, s2],
        panes: [pane1, pane2],
        splitLayout: layout,
        focusedPaneId: 'pane-1',
      })

      useSessionStore.getState().minimizePane('pane-1')

      const state = useSessionStore.getState()
      expect(state.minimizedPaneIds).toContain('pane-1')
      // Focus should shift to non-minimized pane
      expect(state.focusedPaneId).toBe('pane-2')
    })
  })

  // ─── restorePane ──────────────────────────────────────────────────

  describe('restorePane', () => {
    it('removes from minimizedPaneIds and focuses restored pane', () => {
      const pane1 = makePane('pane-1', ['sess-1'])
      const pane2 = makePane('pane-2', ['sess-2'])
      useSessionStore.setState({
        panes: [pane1, pane2],
        splitLayout: {
          type: 'branch',
          direction: 'horizontal',
          ratio: 0.5,
          first: leafNode('pane-1'),
          second: leafNode('pane-2'),
        },
        minimizedPaneIds: ['pane-1'],
        focusedPaneId: 'pane-2',
      })

      useSessionStore.getState().restorePane('pane-1')

      const state = useSessionStore.getState()
      expect(state.minimizedPaneIds).not.toContain('pane-1')
      expect(state.focusedPaneId).toBe('pane-1')
    })
  })

  // ─── handleClaudeSessionEvent ─────────────────────────────────────

  describe('handleClaudeSessionEvent', () => {
    it('stop: preserves lastClaudeSessionId and clears claudeSessionId', async () => {
      const s1 = makeSession({ id: 'sess-1', claudeSessionId: 'claude-1', claudeModel: 'opus' })
      useSessionStore.setState({ sessions: [s1] })

      // Need _currentProjectId set for resume history
      vi.mocked(sessionService.loadWorkspace).mockResolvedValue(null)
      await useSessionStore.getState().loadSessions(PROJECT_ID, CWD)

      // Restore session state (loadSessions resets)
      const s1b = makeSession({ id: 'sess-1b', claudeSessionId: 'claude-1b', claudeModel: 'opus' })
      useSessionStore.setState({ sessions: [s1b] })

      await useSessionStore.getState().handleClaudeSessionEvent({
        wsidnSessionId: 'sess-1b',
        claudeSessionId: null,
        source: 'stop',
        model: 'opus',
      })

      const session = useSessionStore.getState().sessions.find((s) => s.id === 'sess-1b')
      expect(session?.claudeSessionId).toBeNull()
      expect(session?.lastClaudeSessionId).toBe('claude-1b')
      expect(session?.claudeModel).toBeNull()
    })

    it('startup: binds claudeSessionId', async () => {
      const s1 = makeSession({ id: 'sess-1' })
      useSessionStore.setState({ sessions: [s1] })

      await useSessionStore.getState().handleClaudeSessionEvent({
        wsidnSessionId: 'sess-1',
        claudeSessionId: 'claude-new',
        source: 'startup',
        model: 'sonnet',
      })

      const session = useSessionStore.getState().sessions.find((s) => s.id === 'sess-1')
      expect(session?.claudeSessionId).toBe('claude-new')
      expect(session?.claudeModel).toBe('sonnet')
      expect(session?.lastClaudeSessionId).toBe('claude-new')
    })

    it('clear: copies mind tree from previous session', async () => {
      // Set _currentProjectId
      vi.mocked(sessionService.loadWorkspace).mockResolvedValue(null)
      await useSessionStore.getState().loadSessions(PROJECT_ID, CWD)

      const s1 = makeSession({ id: 'sess-1', claudeSessionId: 'claude-old' })
      useSessionStore.setState({ sessions: [s1] })

      await useSessionStore.getState().handleClaudeSessionEvent({
        wsidnSessionId: 'sess-1',
        claudeSessionId: 'claude-new',
        source: 'clear',
        model: 'opus',
      })

      expect(mindtreeService.copy).toHaveBeenCalledWith(PROJECT_ID, 'claude-old', 'claude-new')
    })

    it('startup: does not copy mind tree if no previous session', async () => {
      vi.mocked(sessionService.loadWorkspace).mockResolvedValue(null)
      await useSessionStore.getState().loadSessions(PROJECT_ID, CWD)

      const s1 = makeSession({ id: 'sess-1' }) // no claudeSessionId or lastClaudeSessionId
      useSessionStore.setState({ sessions: [s1] })

      await useSessionStore.getState().handleClaudeSessionEvent({
        wsidnSessionId: 'sess-1',
        claudeSessionId: 'claude-new',
        source: 'startup',
        model: 'opus',
      })

      expect(mindtreeService.copy).not.toHaveBeenCalled()
    })
  })

  // ─── loadSessions ─────────────────────────────────────────────────

  describe('loadSessions', () => {
    it('empty workspace results in empty state', async () => {
      vi.mocked(sessionService.loadWorkspace).mockResolvedValue(null)

      await useSessionStore.getState().loadSessions(PROJECT_ID, CWD)

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(0)
      expect(state.panes).toHaveLength(0)
      expect(state.splitLayout).toBeNull()
      expect(state.focusedPaneId).toBeNull()
    })

    it('v2 workspace restores panes with fresh sessions', async () => {
      const workspace: WorkspaceState = {
        version: 2,
        panes: [
          makePane('pane-1', ['old-sess-1']),
          makePane('pane-2', ['old-sess-2']),
        ],
        splitLayout: {
          type: 'branch',
          direction: 'horizontal',
          ratio: 0.5,
          first: leafNode('pane-1'),
          second: leafNode('pane-2'),
        },
        focusedPaneId: 'pane-1',
        minimizedPaneIds: [],
      }
      vi.mocked(sessionService.loadWorkspace).mockResolvedValue(workspace as never)

      await useSessionStore.getState().loadSessions(PROJECT_ID, CWD)

      const state = useSessionStore.getState()
      // Fresh sessions created, not the old ones
      expect(state.sessions).toHaveLength(2)
      expect(state.sessions.every((s) => s.id !== 'old-sess-1' && s.id !== 'old-sess-2')).toBe(true)
      expect(state.panes).toHaveLength(2)
      // Each pane should have one of the new session IDs
      for (const pane of state.panes) {
        expect(pane.sessionIds).toHaveLength(1)
        expect(state.sessions.some((s) => s.id === pane.sessionIds[0])).toBe(true)
      }
      expect(sessionService.spawn).toHaveBeenCalledTimes(2)
      expect(state.focusedPaneId).toBe('pane-1')
    })
  })

  // ─── renameSession ────────────────────────────────────────────────

  describe('renameSession', () => {
    it('trims and sets name', () => {
      const s1 = makeSession({ id: 'sess-1', name: 'Old Name' })
      useSessionStore.setState({ sessions: [s1] })

      useSessionStore.getState().renameSession('sess-1', '  New Name  ')

      expect(useSessionStore.getState().sessions[0].name).toBe('New Name')
    })

    it('ignores empty name after trim', () => {
      const s1 = makeSession({ id: 'sess-1', name: 'Keep Me' })
      useSessionStore.setState({ sessions: [s1] })

      useSessionStore.getState().renameSession('sess-1', '   ')

      expect(useSessionStore.getState().sessions[0].name).toBe('Keep Me')
    })
  })

  // ─── renamePane ───────────────────────────────────────────────────

  describe('renamePane', () => {
    it('trims and sets pane name', () => {
      const pane = makePane('pane-1', ['sess-1'])
      useSessionStore.setState({ panes: [pane] })

      useSessionStore.getState().renamePane('pane-1', '  My Pane  ')

      expect(useSessionStore.getState().panes[0].name).toBe('My Pane')
    })

    it('ignores empty name after trim', () => {
      const pane = makePane('pane-1', ['sess-1'])
      pane.name = 'Keep Me'
      useSessionStore.setState({ panes: [pane] })

      useSessionStore.getState().renamePane('pane-1', '   ')

      expect(useSessionStore.getState().panes[0].name).toBe('Keep Me')
    })
  })

  // ─── focusPane ────────────────────────────────────────────────────

  describe('focusPane', () => {
    it('sets focusedPaneId', () => {
      useSessionStore.getState().focusPane('pane-42')
      expect(useSessionStore.getState().focusedPaneId).toBe('pane-42')
    })
  })

  // ─── updateSplitRatio ─────────────────────────────────────────────

  describe('updateSplitRatio', () => {
    it('updates ratio at path in layout', () => {
      const layout: SplitNode = {
        type: 'branch',
        direction: 'horizontal',
        ratio: 0.5,
        first: leafNode('pane-1'),
        second: leafNode('pane-2'),
      }
      useSessionStore.setState({ splitLayout: layout })

      useSessionStore.getState().updateSplitRatio('', 0.7)

      const updated = useSessionStore.getState().splitLayout
      expect(updated?.type).toBe('branch')
      if (updated?.type === 'branch') {
        expect(updated.ratio).toBe(0.7)
      }
    })

    it('does nothing when splitLayout is null', () => {
      useSessionStore.setState({ splitLayout: null })
      useSessionStore.getState().updateSplitRatio('', 0.7)
      expect(useSessionStore.getState().splitLayout).toBeNull()
    })
  })

  // ─── toggleSessionManager ─────────────────────────────────────────

  describe('toggleSessionManager', () => {
    it('toggles sessionManagerEnabled for a session', async () => {
      await useSessionStore.getState().toggleSessionManager('sess-1', PROJECT_ID, CWD, 'claude-1')

      expect(useSessionStore.getState().sessionManagerEnabled['sess-1']).toBe(true)
      expect(sessionService.sessionManagerSetEnabled).toHaveBeenCalledWith('sess-1', true, {
        projectId: PROJECT_ID,
        cwd: CWD,
        claudeSessionId: 'claude-1',
      })

      await useSessionStore.getState().toggleSessionManager('sess-1', PROJECT_ID, CWD, 'claude-1')

      expect(useSessionStore.getState().sessionManagerEnabled['sess-1']).toBe(false)
    })
  })
})
