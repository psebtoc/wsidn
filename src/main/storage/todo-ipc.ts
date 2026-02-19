import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { listTodos, createTodo, updateTodo, deleteTodo, deleteTodoById } from './todo-storage'

export function registerTodoIpc(): void {
  ipcMain.handle(IPC_CHANNELS.TODO_LIST, (_event, { sessionId }: { sessionId: string }) => {
    try {
      const todos = listTodos(sessionId)
      return { success: true, data: todos }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.TODO_CREATE,
    (
      _event,
      input: {
        sessionId: string
        title: string
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
        sessionId: string
        title?: string
        description?: string
        status?: 'pending' | 'in_progress' | 'done'
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
    (_event, { sessionId, id }: { sessionId?: string; id: string }) => {
      try {
        if (sessionId) {
          deleteTodo(sessionId, id)
        } else {
          deleteTodoById(id)
        }
        return { success: true, data: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
