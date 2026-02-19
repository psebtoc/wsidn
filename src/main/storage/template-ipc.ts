import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from './template-storage'

export function registerTemplateIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_LIST,
    (_event, { projectId }: { projectId: string | null }) => {
      try {
        const templates = listTemplates(projectId)
        return { success: true, data: templates }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_CREATE,
    (
      _event,
      input: {
        title: string
        content: string
        scope: 'global' | 'project'
        projectId?: string | null
      }
    ) => {
      try {
        const template = createTemplate(input)
        return { success: true, data: template }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_UPDATE,
    (
      _event,
      input: {
        id: string
        title?: string
        content?: string
      }
    ) => {
      try {
        const template = updateTemplate(input)
        return { success: true, data: template }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_DELETE, (_event, { id }: { id: string }) => {
    try {
      deleteTemplate(id)
      return { success: true, data: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
