import { create } from 'zustand'
import { mindtreeService } from '@renderer/services/mindtree-service'
import type { MindTreeItem, CreateMindTreeItemInput, UpdateMindTreeItemInput } from '@renderer/types/project'

interface MindTreeState {
  itemsBySession: Record<string, MindTreeItem[]>
  expandedIds: Set<string>
  loadingBySession: Record<string, boolean>
  currentProjectId: string | null
  // actions
  loadItems: (projectId: string, sessionId: string) => Promise<void>
  addItem: (input: CreateMindTreeItemInput) => Promise<MindTreeItem>
  updateItem: (input: UpdateMindTreeItemInput) => Promise<void>
  removeItem: (projectId: string, sessionId: string, id: string) => Promise<void>
  toggleExpand: (id: string) => void
}

function collectChildIds(items: MindTreeItem[], parentId: string): string[] {
  const ids: string[] = []
  for (const t of items) {
    if (t.parentId === parentId) {
      ids.push(t.id)
      ids.push(...collectChildIds(items, t.id))
    }
  }
  return ids
}

export const useMindTreeStore = create<MindTreeState>((set, get) => ({
  itemsBySession: {},
  expandedIds: new Set<string>(),
  loadingBySession: {},
  currentProjectId: null,

  loadItems: async (projectId, sessionId) => {
    set((s) => ({
      currentProjectId: projectId,
      loadingBySession: { ...s.loadingBySession, [sessionId]: true },
    }))
    const items = await mindtreeService.list(projectId, sessionId)
    set((s) => ({
      itemsBySession: { ...s.itemsBySession, [sessionId]: items },
      loadingBySession: { ...s.loadingBySession, [sessionId]: false },
    }))
  },

  addItem: async (input) => {
    const item = await mindtreeService.create(input)
    set((s) => ({
      itemsBySession: {
        ...s.itemsBySession,
        [item.sessionId]: [...(s.itemsBySession[item.sessionId] ?? []), item],
      },
    }))
    return item
  },

  updateItem: async (input) => {
    // Find the existing item to enrich with sessionId/projectId
    let existing: MindTreeItem | undefined
    for (const items of Object.values(get().itemsBySession)) {
      existing = items.find((t) => t.id === input.id)
      if (existing) break
    }
    const projectId = input.projectId ?? get().currentProjectId ?? undefined
    const enriched = existing
      ? { ...input, sessionId: existing.sessionId, projectId }
      : input
    const item = await mindtreeService.update(enriched)
    set((s) => ({
      itemsBySession: {
        ...s.itemsBySession,
        [item.sessionId]: (s.itemsBySession[item.sessionId] ?? []).map((t) =>
          t.id === item.id ? item : t
        ),
      },
    }))
  },

  removeItem: async (projectId, sessionId, id) => {
    await mindtreeService.delete(projectId, sessionId, id)
    const sessionItems = get().itemsBySession[sessionId] ?? []
    const childIds = collectChildIds(sessionItems, id)
    const removeSet = new Set([id, ...childIds])
    set((s) => ({
      itemsBySession: {
        ...s.itemsBySession,
        [sessionId]: (s.itemsBySession[sessionId] ?? []).filter((t) => !removeSet.has(t.id)),
      },
    }))
  },

  toggleExpand: (id) => {
    set((s) => {
      const next = new Set(s.expandedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { expandedIds: next }
    })
  },
}))
