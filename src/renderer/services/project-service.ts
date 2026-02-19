import { unwrapIpc } from '@renderer/types/ipc'

export const projectService = {
  async create(name: string, path: string) {
    return unwrapIpc(await window.wsidn.project.create(name, path))
  },
  async list() {
    return unwrapIpc(await window.wsidn.project.list())
  },
  async delete(projectId: string) {
    return unwrapIpc(await window.wsidn.project.delete(projectId))
  },
  async selectDir() {
    return unwrapIpc(await window.wsidn.project.selectDir())
  },
}
