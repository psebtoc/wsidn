import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { getAppDataPath, readJson, writeJson, ensureDir } from './storage-manager'

type MindTreeCategory = 'task' | 'decision' | 'note'
type MindTreeItemStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

interface MindTreeItem {
  id: string
  sessionId: string
  category: MindTreeCategory
  title: string
  description: string
  status: MindTreeItemStatus
  priority: 'low' | 'medium' | 'high'
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
}

function mindtreePath(projectId: string, sessionId: string): string {
  return getAppDataPath('projects', projectId, 'mindtree', `${sessionId}.json`)
}

/** List all Mind Tree items for the given project/session. */
export function listItems(projectId: string, sessionId: string): MindTreeItem[] {
  const items = readJson<MindTreeItem[]>(mindtreePath(projectId, sessionId), [])
  // Migration fallback: existing items without category default to 'task'
  return items.map((item) => ({ ...item, category: item.category ?? 'task' }))
}

/** Create a new Mind Tree item. */
export function createItem(input: {
  projectId: string
  sessionId: string
  title: string
  category?: MindTreeCategory
  description?: string
  priority?: 'low' | 'medium' | 'high'
  parentId?: string | null
}): MindTreeItem {
  const filePath = mindtreePath(input.projectId, input.sessionId)
  ensureDir(join(filePath, '..'))
  const items = listItems(input.projectId, input.sessionId)
  const now = new Date().toISOString()

  const item: MindTreeItem = {
    id: uuid(),
    sessionId: input.sessionId,
    category: input.category ?? 'task',
    title: input.title,
    description: input.description ?? '',
    status: 'pending',
    priority: input.priority ?? 'medium',
    parentId: input.parentId ?? null,
    order: items.length,
    createdAt: now,
    updatedAt: now,
  }

  items.push(item)
  writeJson(filePath, items)
  return item
}

/** Update an existing Mind Tree item by id. */
export function updateItem(input: {
  id: string
  projectId: string
  sessionId: string
  title?: string
  description?: string
  status?: MindTreeItemStatus
  priority?: 'low' | 'medium' | 'high'
  parentId?: string | null
  order?: number
}): MindTreeItem {
  const items = listItems(input.projectId, input.sessionId)
  const idx = items.findIndex((item) => item.id === input.id)
  if (idx === -1) throw new Error(`MindTreeItem not found: ${input.id}`)

  const existing = items[idx]
  const updated: MindTreeItem = {
    ...existing,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.parentId !== undefined && { parentId: input.parentId }),
    ...(input.order !== undefined && { order: input.order }),
    updatedAt: new Date().toISOString(),
  }

  items[idx] = updated
  writeJson(mindtreePath(input.projectId, input.sessionId), items)
  return updated
}

/** Copy all Mind Tree items from one session to another. */
export function copyItems(projectId: string, fromSessionId: string, toSessionId: string): void {
  const items = listItems(projectId, fromSessionId)
  if (items.length === 0) return
  const copied = items.map((item) => ({ ...item, sessionId: toSessionId }))
  const destPath = mindtreePath(projectId, toSessionId)
  ensureDir(join(destPath, '..'))
  writeJson(destPath, copied)
}

/**
 * Replaces all task and decision items for a session with new ones from the Session Manager.
 * Note items are preserved. Single atomic write.
 */
export function replaceTasksAndDecisions(
  projectId: string,
  sessionId: string,
  tasks: Array<{
    title: string
    status?: MindTreeItemStatus
    blockedReason?: string | null
    checklist?: string[]
  }>,
  decisions: Array<{ title: string }>
): MindTreeItem[] {
  const filePath = mindtreePath(projectId, sessionId)
  ensureDir(join(filePath, '..'))

  // Keep notes, replace everything else
  const existing = listItems(projectId, sessionId)
  const notes = existing.filter((item) => item.category === 'note')

  const now = new Date().toISOString()
  const newItems: MindTreeItem[] = [...notes]
  let order = notes.length

  for (const task of tasks) {
    const taskId = uuid()
    const status: MindTreeItemStatus =
      task.status === 'blocked' || task.status === 'in_progress' || task.status === 'done'
        ? task.status
        : 'pending'
    newItems.push({
      id: taskId,
      sessionId,
      category: 'task',
      title: task.title,
      description: task.blockedReason ?? '',
      status,
      priority: 'medium',
      parentId: null,
      order: order++,
      createdAt: now,
      updatedAt: now,
    })
    for (const checkItem of task.checklist ?? []) {
      newItems.push({
        id: uuid(),
        sessionId,
        category: 'task',
        title: checkItem,
        description: '',
        status: 'pending',
        priority: 'medium',
        parentId: taskId,
        order: order++,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  for (const decision of decisions) {
    newItems.push({
      id: uuid(),
      sessionId,
      category: 'decision',
      title: decision.title,
      description: '',
      status: 'pending',
      priority: 'medium',
      parentId: null,
      order: order++,
      createdAt: now,
      updatedAt: now,
    })
  }

  writeJson(filePath, newItems)
  return newItems
}

/** Delete a Mind Tree item and all its descendants. */
export function deleteItem(projectId: string, sessionId: string, id: string): void {
  const items = listItems(projectId, sessionId)

  // Collect IDs to delete (target + all descendants)
  const toDelete = new Set<string>()
  function collectChildren(parentId: string): void {
    toDelete.add(parentId)
    for (const item of items) {
      if (item.parentId === parentId) {
        collectChildren(item.id)
      }
    }
  }
  collectChildren(id)

  const remaining = items.filter((item) => !toDelete.has(item.id))
  writeJson(mindtreePath(projectId, sessionId), remaining)
}
