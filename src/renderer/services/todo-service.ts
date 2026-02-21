import { unwrapIpc } from '@renderer/types/ipc'
import type { CreateTodoInput, UpdateTodoInput } from '@renderer/types/project'

export const todoService = {
  async list(projectId: string, sessionId: string) {
    return unwrapIpc(await window.wsidn.todo.list(projectId, sessionId))
  },
  async create(input: CreateTodoInput) {
    return unwrapIpc(await window.wsidn.todo.create(input))
  },
  async update(input: UpdateTodoInput) {
    return unwrapIpc(await window.wsidn.todo.update(input))
  },
  async delete(projectId: string, sessionId: string, id: string) {
    return unwrapIpc(await window.wsidn.todo.delete(projectId, sessionId, id))
  },
  async copyMindTree(projectId: string, fromSessionId: string, toSessionId: string) {
    return unwrapIpc(await window.wsidn.todo.copyMindTree(projectId, fromSessionId, toSessionId))
  },
}
