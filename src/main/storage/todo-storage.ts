import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { getAppDataPath, readJson, writeJson, ensureDir } from './storage-manager'

type MindTreeCategory = 'task' | 'decision' | 'note'
type TodoStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

interface Todo {
  id: string
  sessionId: string
  category: MindTreeCategory
  title: string
  description: string
  status: TodoStatus
  priority: 'low' | 'medium' | 'high'
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
}

function mindtreePath(projectId: string, sessionId: string): string {
  return getAppDataPath('projects', projectId, 'mindtree', `${sessionId}.json`)
}

export function listTodos(projectId: string, sessionId: string): Todo[] {
  const todos = readJson<Todo[]>(mindtreePath(projectId, sessionId), [])
  // Migration fallback: existing items without category default to 'task'
  return todos.map((t) => ({ ...t, category: t.category ?? 'task' }))
}

export function createTodo(input: {
  projectId: string
  sessionId: string
  title: string
  category?: MindTreeCategory
  description?: string
  priority?: 'low' | 'medium' | 'high'
  parentId?: string | null
}): Todo {
  const filePath = mindtreePath(input.projectId, input.sessionId)
  ensureDir(join(filePath, '..'))
  const todos = listTodos(input.projectId, input.sessionId)
  const now = new Date().toISOString()

  const todo: Todo = {
    id: uuid(),
    sessionId: input.sessionId,
    category: input.category ?? 'task',
    title: input.title,
    description: input.description ?? '',
    status: 'pending',
    priority: input.priority ?? 'medium',
    parentId: input.parentId ?? null,
    order: todos.length,
    createdAt: now,
    updatedAt: now,
  }

  todos.push(todo)
  writeJson(filePath, todos)
  return todo
}

export function updateTodo(input: {
  id: string
  projectId: string
  sessionId: string
  title?: string
  description?: string
  status?: TodoStatus
  priority?: 'low' | 'medium' | 'high'
  parentId?: string | null
  order?: number
}): Todo {
  const todos = listTodos(input.projectId, input.sessionId)
  const idx = todos.findIndex((t) => t.id === input.id)
  if (idx === -1) throw new Error(`Todo not found: ${input.id}`)

  const existing = todos[idx]
  const updated: Todo = {
    ...existing,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.parentId !== undefined && { parentId: input.parentId }),
    ...(input.order !== undefined && { order: input.order }),
    updatedAt: new Date().toISOString(),
  }

  todos[idx] = updated
  writeJson(mindtreePath(input.projectId, input.sessionId), todos)
  return updated
}

export function copyTodos(projectId: string, fromSessionId: string, toSessionId: string): void {
  const todos = listTodos(projectId, fromSessionId)
  if (todos.length === 0) return
  const copied = todos.map((t) => ({ ...t, sessionId: toSessionId }))
  const destPath = mindtreePath(projectId, toSessionId)
  ensureDir(join(destPath, '..'))
  writeJson(destPath, copied)
}

/**
 * Replaces all task and decision todos for a session with new ones from the Session Manager.
 * Note todos are preserved. Single atomic write.
 */
export function replaceTasksAndDecisions(
  projectId: string,
  sessionId: string,
  tasks: Array<{
    title: string
    status?: TodoStatus
    blockedReason?: string | null
    checklist?: string[]
  }>,
  decisions: Array<{ title: string }>
): Todo[] {
  const filePath = mindtreePath(projectId, sessionId)
  ensureDir(join(filePath, '..'))

  // Keep notes, replace everything else
  const existing = listTodos(projectId, sessionId)
  const notes = existing.filter((t) => t.category === 'note')

  const now = new Date().toISOString()
  const newTodos: Todo[] = [...notes]
  let order = notes.length

  for (const task of tasks) {
    const taskId = uuid()
    const status: TodoStatus =
      task.status === 'blocked' || task.status === 'in_progress' || task.status === 'done'
        ? task.status
        : 'pending'
    newTodos.push({
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
    for (const item of task.checklist ?? []) {
      newTodos.push({
        id: uuid(),
        sessionId,
        category: 'task',
        title: item,
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
    newTodos.push({
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

  writeJson(filePath, newTodos)
  return newTodos
}

export function deleteTodo(projectId: string, sessionId: string, id: string): void {
  const todos = listTodos(projectId, sessionId)

  // Collect IDs to delete (target + all descendants)
  const toDelete = new Set<string>()
  function collectChildren(parentId: string): void {
    toDelete.add(parentId)
    for (const t of todos) {
      if (t.parentId === parentId) {
        collectChildren(t.id)
      }
    }
  }
  collectChildren(id)

  const remaining = todos.filter((t) => !toDelete.has(t.id))
  writeJson(mindtreePath(projectId, sessionId), remaining)
}
