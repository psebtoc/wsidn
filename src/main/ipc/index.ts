import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { registerPtyIpc } from '@main/pty/pty-ipc'
import { registerStorageIpc } from '@main/storage/storage-ipc'
import { registerTodoIpc } from '@main/storage/todo-ipc'
import { registerTemplateIpc } from '@main/storage/template-ipc'
import { registerSessionManagerIpc } from '@main/session-manager/session-manager-ipc'

function registerWindowIpc(): void {
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    BrowserWindow.getFocusedWindow()?.close()
  })
}

export function registerAllIpc(): void {
  registerStorageIpc()
  registerTodoIpc()
  registerTemplateIpc()
  registerPtyIpc()
  registerWindowIpc()
  registerSessionManagerIpc()
}
