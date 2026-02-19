import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { ptyManager } from './pty/pty-manager'
import { registerAllIpc } from './ipc'
import { hookServer } from './hook-server/hook-server'
import { setupHookScript, setupClaudeSettings } from './hook-server/hook-setup'

// Set userData path before app ready
app.setPath('userData', join(app.getPath('appData'), 'wsidn'))

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.wsidn.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAllIpc()

  const mainWindow = createWindow()
  ptyManager.init(mainWindow)

  hookServer.init(mainWindow)
  hookServer.start().catch((err) => console.error('[HookServer] start failed:', err))
  setupHookScript()
  setupClaudeSettings()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  hookServer.stop()
  ptyManager.killAll()
})
