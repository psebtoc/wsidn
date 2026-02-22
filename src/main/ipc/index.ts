import { ipcMain, BrowserWindow, shell } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { registerPtyIpc } from '@main/pty/pty-ipc'
import { registerStorageIpc } from '@main/storage/storage-ipc'
import { registerMindTreeIpc } from '@main/storage/mindtree-ipc'
import { registerTemplateIpc } from '@main/storage/template-ipc'
import { registerSessionManagerIpc } from '@main/session-manager/session-manager-ipc'

function registerShellIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_e, { url }: { url: string }) => {
    await shell.openExternal(url)
  })

  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_PATH, async (_e, { path }: { path: string }) => {
    await shell.openPath(path)
  })
}

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
  registerMindTreeIpc()
  registerTemplateIpc()
  registerPtyIpc()
  registerShellIpc()
  registerWindowIpc()
  registerSessionManagerIpc()
}
