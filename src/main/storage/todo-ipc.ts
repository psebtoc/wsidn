import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { listTodos, createTodo, updateTodo, deleteTodo, copyTodos } from './todo-storage'

export function registerTodoIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.TODO_LIST,
    (_event, { projectId, sessionId }: { projectId: string; sessionId: string }) => {
      try {
        const todos = listTodos(projectId, sessionId)
        return { success: true, data: todos }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TODO_CREATE,
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
        const todo = createTodo(input)
        return { success: true, data: todo }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TODO_UPDATE,
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
        const todo = updateTodo(input)
        return { success: true, data: todo }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TODO_DELETE,
    (_event, { projectId, sessionId, id }: { projectId: string; sessionId: string; id: string }) => {
      try {
        deleteTodo(projectId, sessionId, id)
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
        copyTodos(projectId, fromSessionId, toSessionId)
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
