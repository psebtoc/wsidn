import { ipcMain, dialog } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { createProject, listProjects, deleteProject, getProject, updateProject } from './project-storage'
import { getAppDataPath, readJson, writeJson } from './storage-manager'

interface TerminalConfig {
  fontSize: number
  fontFamily: string
  cursorStyle: 'block' | 'underline' | 'bar'
  cursorBlink: boolean
  scrollback: number
  background: string
  foreground: string
}

interface AppConfig {
  theme: 'dark' | 'light'
  defaultShell: string
  terminal: TerminalConfig
  language: 'ko' | 'en'
}

const DEFAULT_TERMINAL: TerminalConfig = {
  fontSize: 14,
  fontFamily: 'Consolas, monospace',
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 5000,
  background: '#1a1a1a',
  foreground: '#e0e0e0',
}

const DEFAULT_CONFIG: AppConfig = {
  theme: 'dark',
  defaultShell: '',
  terminal: DEFAULT_TERMINAL,
  language: 'ko',
}

function getConfigPath(): string {
  return getAppDataPath('config.json')
}

export function registerStorageIpc(): void {
  // --- Project handlers ---

  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, (_event, { name, path }: { name: string; path: string }) => {
    try {
      const project = createProject(name, path)
      return { success: true, data: project }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST, () => {
    try {
      const projects = listProjects()
      return { success: true, data: projects }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, (_event, { projectId }: { projectId: string }) => {
    try {
      deleteProject(projectId)
      return { success: true, data: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_UPDATE,
    (_event, { projectId, data }: { projectId: string; data: Record<string, unknown> }) => {
      try {
        const project = updateProject(projectId, data)
        return { success: true, data: project }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROJECT_SELECT_DIR, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null }
      }
      return { success: true, data: result.filePaths[0] }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // --- Config handlers ---

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, () => {
    try {
      const raw = readJson<Partial<AppConfig>>(getConfigPath(), {})
      const config: AppConfig = {
        ...DEFAULT_CONFIG,
        ...raw,
        terminal: { ...DEFAULT_TERMINAL, ...raw.terminal },
      }
      return { success: true, data: config }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, (_event, { key, value }: { key: string; value: unknown }) => {
    try {
      const config = readJson<AppConfig>(getConfigPath(), DEFAULT_CONFIG)
      ;(config as unknown as Record<string, unknown>)[key] = value
      writeJson(getConfigPath(), config)
      return { success: true, data: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
