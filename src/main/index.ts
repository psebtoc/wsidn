import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { ptyManager } from './pty/pty-manager'
import { registerAllIpc } from './ipc'
import { hookServer } from './hook-server/hook-server'
import { setupHookScript, setupClaudeSettings } from './hook-server/hook-setup'
import { readJson, writeJson, getAppDataPath } from './storage/storage-manager'

// Set userData path before app ready
app.setPath('userData', join(app.getPath('appData'), 'wsidn'))

// --- Window bounds persistence ---

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

const DEFAULT_BOUNDS: WindowBounds = { x: -1, y: -1, width: 1200, height: 800, isMaximized: false }

function getBoundsPath(): string {
  return getAppDataPath('window-bounds.json')
}

function loadBounds(): WindowBounds {
  return readJson<WindowBounds>(getBoundsPath(), DEFAULT_BOUNDS)
}

function saveBounds(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  const isMaximized = win.isMaximized()
  const bounds = isMaximized ? (win as any)._lastNormalBounds ?? win.getNormalBounds() : win.getBounds()
  writeJson(getBoundsPath(), { ...bounds, isMaximized })
}

function createWindow(): BrowserWindow {
  const saved = loadBounds()

  const opts: Electron.BrowserWindowConstructorOptions = {
    width: saved.width,
    height: saved.height,
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  }
  if (saved.x >= 0 && saved.y >= 0) {
    opts.x = saved.x
    opts.y = saved.y
  }

  const mainWindow = new BrowserWindow(opts)

  if (saved.isMaximized) mainWindow.maximize()

  // Track normal bounds for saving when maximized
  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  const debouncedSave = () => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => saveBounds(mainWindow), 300)
  }

  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) (mainWindow as any)._lastNormalBounds = mainWindow.getBounds()
    debouncedSave()
  })
  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) (mainWindow as any)._lastNormalBounds = mainWindow.getBounds()
    debouncedSave()
  })
  mainWindow.on('close', () => saveBounds(mainWindow))

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
