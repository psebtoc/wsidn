import { unwrapIpc } from '@renderer/types/ipc'
import type { CreateTemplateInput, UpdateTemplateInput } from '@renderer/types/project'

export const templateService = {
  async list(projectId: string | null) {
    return unwrapIpc(await window.wsidn.template.list(projectId))
  },
  async create(input: CreateTemplateInput) {
    return unwrapIpc(await window.wsidn.template.create(input))
  },
  async update(input: UpdateTemplateInput) {
    return unwrapIpc(await window.wsidn.template.update(input))
  },
  async delete(id: string) {
    return unwrapIpc(await window.wsidn.template.delete(id))
  },
}
