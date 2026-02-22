import { useEffect } from 'react'
import { useSessionStore } from '@renderer/stores/session-store'
import { matchAction } from '@renderer/utils/shortcut-registry'
import { getPaneIds } from '@renderer/utils/split-utils'
import { focusTerminal } from '@renderer/hooks/useTerminal'

export function useKeyboardShortcuts(projectId: string, cwd: string): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if focused on a text input element (not the xterm canvas)
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        (target.tagName === 'TEXTAREA' && !target.classList.contains('xterm-helper-textarea')) ||
        target.contentEditable === 'true'
      ) {
        return
      }

      const store = useSessionStore.getState()
      const { focusedPaneId, panes, splitLayout, minimizedPaneIds } = store

      if (matchAction(e, 'create-session')) {
        e.preventDefault()
        if (focusedPaneId) {
          store.createSessionInPane(focusedPaneId, projectId, cwd)
        }
        return
      }

      const isTabNext = matchAction(e, 'switch-tab-next')
      const isTabPrev = matchAction(e, 'switch-tab-prev')
      if (isTabNext || isTabPrev) {
        e.preventDefault()
        if (!focusedPaneId) return
        const pane = panes.find((p) => p.id === focusedPaneId)
        if (!pane || pane.sessionIds.length <= 1) return
        const idx = pane.sessionIds.indexOf(pane.activeSessionId ?? '')
        const delta = isTabNext ? 1 : -1
        const nextIdx = (idx + delta + pane.sessionIds.length) % pane.sessionIds.length
        const nextSessionId = pane.sessionIds[nextIdx]
        store.setActiveSessionInPane(focusedPaneId, nextSessionId)
        requestAnimationFrame(() => focusTerminal(nextSessionId))
        return
      }

      const isPaneNext = matchAction(e, 'switch-pane-next')
      const isPanePrev = matchAction(e, 'switch-pane-prev')
      if (isPaneNext || isPanePrev) {
        e.preventDefault()
        if (!splitLayout) return
        const allIds = getPaneIds(splitLayout)
        const visibleIds = allIds.filter((id) => !minimizedPaneIds.includes(id))
        if (visibleIds.length <= 1) return
        const idx = visibleIds.indexOf(focusedPaneId ?? '')
        const delta = isPaneNext ? 1 : -1
        const nextIdx = (idx + delta + visibleIds.length) % visibleIds.length
        const nextPaneId = visibleIds[nextIdx]
        store.focusPane(nextPaneId)
        const targetPane = panes.find((p) => p.id === nextPaneId)
        if (targetPane?.activeSessionId) focusTerminal(targetPane.activeSessionId)
        return
      }

      if (matchAction(e, 'minimize-pane')) {
        e.preventDefault()
        if (focusedPaneId) store.minimizePane(focusedPaneId)
        return
      }

      if (matchAction(e, 'toggle-mindtree')) {
        e.preventDefault()
        if (focusedPaneId) store.toggleMindTree(focusedPaneId)
        return
      }

      const isCreateTask = matchAction(e, 'create-task')
      const isCreateDecision = matchAction(e, 'create-decision')
      if (isCreateTask || isCreateDecision) {
        e.preventDefault()
        if (!focusedPaneId) return
        const pane = panes.find((p) => p.id === focusedPaneId)
        const activeSessionId = pane?.activeSessionId
        if (!activeSessionId) return
        store.setShowMindTree(focusedPaneId, true)
        const category = isCreateTask ? 'task' : 'decision'
        store.triggerMindTreeCreate(activeSessionId, category)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [projectId, cwd])
}
