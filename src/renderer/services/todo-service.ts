import { unwrapIpc } from '@renderer/types/ipc'
import type { CreateTodoInput, UpdateTodoInput } from '@renderer/types/project'

export const todoService = {
  async list(sessionId: string) {
    return unwrapIpc(await window.wsidn.todo.list(sessionId))
  },
  async create(input: CreateTodoInput) {
    return unwrapIpc(await window.wsidn.todo.create(input))
  },
  async update(input: UpdateTodoInput) {
    return unwrapIpc(await window.wsidn.todo.update(input))
  },
  async delete(id: string) {
    return unwrapIpc(await window.wsidn.todo.delete(id))
  },
}
