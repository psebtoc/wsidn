import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { getAppDataPath, readJson, writeJson, ensureDir } from './storage-manager'

interface Todo {
  id: string
  sessionId: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
}

function todosPath(sessionId: string): string {
  return getAppDataPath('sessions', sessionId, 'todos.json')
}

export function listTodos(sessionId: string): Todo[] {
  return readJson<Todo[]>(todosPath(sessionId), [])
}

export function createTodo(input: {
  sessionId: string
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  parentId?: string | null
}): Todo {
  const filePath = todosPath(input.sessionId)
  ensureDir(join(filePath, '..'))
  const todos = listTodos(input.sessionId)
  const now = new Date().toISOString()

  const todo: Todo = {
    id: uuid(),
    sessionId: input.sessionId,
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
  sessionId: string
  title?: string
  description?: string
  status?: 'pending' | 'in_progress' | 'done'
  priority?: 'low' | 'medium' | 'high'
  parentId?: string | null
  order?: number
}): Todo {
  const todos = listTodos(input.sessionId)
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
  writeJson(todosPath(input.sessionId), todos)
  return updated
}

export function deleteTodoById(id: string): void {
  const sessionsDir = getAppDataPath('sessions')
  if (!existsSync(sessionsDir)) throw new Error(`Todo not found: ${id}`)

  const entries = readdirSync(sessionsDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const filePath = join(sessionsDir, entry.name, 'todos.json')
    if (!existsSync(filePath)) continue
    const todos = readJson<Todo[]>(filePath, [])
    if (todos.some((t) => t.id === id)) {
      deleteTodo(entry.name, id)
      return
    }
  }
  throw new Error(`Todo not found: ${id}`)
}

export function deleteTodo(sessionId: string, id: string): void {
  const todos = listTodos(sessionId)

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
  writeJson(todosPath(sessionId), remaining)
}
