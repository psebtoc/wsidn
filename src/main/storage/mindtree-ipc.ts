import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { listItems, createItem, updateItem, deleteItem, copyItems } from './mindtree-storage'

export function registerMindTreeIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.MINDTREE_LIST,
    (_event, { projectId, sessionId }: { projectId: string; sessionId: string }) => {
      try {
        const items = listItems(projectId, sessionId)
        return { success: true, data: items }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MINDTREE_CREATE,
    (
      _event,
      input: {
        projectId: string
        sessionId: string
        title: string
        category?: 'task' | 'decision' | 'note'
        description?: string
        priority?: 'low' | 'medium' | 'high'
        parentId?: string | null
      }
    ) => {
      try {
        const item = createItem(input)
        return { success: true, data: item }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MINDTREE_UPDATE,
    (
      _event,
      input: {
        id: string
        projectId: string
        sessionId: string
        title?: string
        description?: string
        status?: 'pending' | 'in_progress' | 'done' | 'blocked'
        priority?: 'low' | 'medium' | 'high'
        parentId?: string | null
        order?: number
      }
    ) => {
      try {
        const item = updateItem(input)
        return { success: true, data: item }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MINDTREE_DELETE,
    (_event, { projectId, sessionId, id }: { projectId: string; sessionId: string; id: string }) => {
      try {
        deleteItem(projectId, sessionId, id)
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MINDTREE_COPY,
    (_event, { projectId, fromSessionId, toSessionId }: { projectId: string; fromSessionId: string; toSessionId: string }) => {
      try {
        copyItems(projectId, fromSessionId, toSessionId)
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
