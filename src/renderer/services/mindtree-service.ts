import { unwrapIpc } from '@renderer/types/ipc'
import type { CreateMindTreeItemInput, UpdateMindTreeItemInput } from '@renderer/types/project'

export const mindtreeService = {
  async list(projectId: string, sessionId: string) {
    return unwrapIpc(await window.wsidn.mindtree.list(projectId, sessionId))
  },
  async create(input: CreateMindTreeItemInput) {
    return unwrapIpc(await window.wsidn.mindtree.create(input))
  },
  async update(input: UpdateMindTreeItemInput) {
    return unwrapIpc(await window.wsidn.mindtree.update(input))
  },
  async delete(projectId: string, sessionId: string, id: string) {
    return unwrapIpc(await window.wsidn.mindtree.delete(projectId, sessionId, id))
  },
  async copy(projectId: string, fromSessionId: string, toSessionId: string) {
    return unwrapIpc(await window.wsidn.mindtree.copy(projectId, fromSessionId, toSessionId))
  },
}
