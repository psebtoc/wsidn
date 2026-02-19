import { create } from 'zustand'
import { todoService } from '@renderer/services/todo-service'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@renderer/types/project'

interface TodoState {
  todos: Todo[]
  expandedIds: Set<string>
  loading: boolean
  // actions
  loadTodos: (sessionId: string) => Promise<void>
  addTodo: (input: CreateTodoInput) => Promise<Todo>
  updateTodo: (input: UpdateTodoInput) => Promise<void>
  removeTodo: (id: string) => Promise<void>
  toggleExpand: (id: string) => void
}

function collectChildIds(todos: Todo[], parentId: string): string[] {
  const ids: string[] = []
  for (const t of todos) {
    if (t.parentId === parentId) {
      ids.push(t.id)
      ids.push(...collectChildIds(todos, t.id))
    }
  }
  return ids
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  expandedIds: new Set<string>(),
  loading: false,

  loadTodos: async (sessionId) => {
    set({ loading: true })
    const todos = await todoService.list(sessionId)
    set({ todos, loading: false })
  },

  addTodo: async (input) => {
    const todo = await todoService.create(input)
    set((s) => ({ todos: [...s.todos, todo] }))
    return todo
  },

  updateTodo: async (input) => {
    const existing = get().todos.find((t) => t.id === input.id)
    const enriched = existing ? { ...input, sessionId: existing.sessionId } : input
    const todo = await todoService.update(enriched)
    set((s) => ({
      todos: s.todos.map((t) => (t.id === todo.id ? todo : t)),
    }))
  },

  removeTodo: async (id) => {
    await todoService.delete(id)
    const childIds = collectChildIds(get().todos, id)
    const removeSet = new Set([id, ...childIds])
    set((s) => ({
      todos: s.todos.filter((t) => !removeSet.has(t.id)),
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
