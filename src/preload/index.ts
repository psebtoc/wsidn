import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('wsidn', {
  project: {
    create: (name: string, path: string) => ipcRenderer.invoke('project:create', { name, path }),
    list: () => ipcRenderer.invoke('project:list'),
    delete: (projectId: string) => ipcRenderer.invoke('project:delete', { projectId }),
    update: (projectId: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('project:update', { projectId, data }),
    selectDir: () => ipcRenderer.invoke('project:selectDir')
  },

  session: {
    close: (sessionId: string) => ipcRenderer.invoke('session:close', { sessionId }),
    createWorktree: (projectId: string, cwd: string, branchName: string) =>
      ipcRenderer.invoke('session:createWorktree', { projectId, cwd, branchName }),
    spawn: (sessionId: string, cwd: string) =>
      ipcRenderer.invoke('session:spawn', { sessionId, cwd }),
  },

  resumeHistory: {
    list: (projectId: string) =>
      ipcRenderer.invoke('resumeHistory:list', { projectId }),
    append: (projectId: string, entry: Record<string, unknown>) =>
      ipcRenderer.invoke('resumeHistory:append', { projectId, entry }),
    appendSync: (projectId: string, entry: Record<string, unknown>) =>
      ipcRenderer.sendSync('resumeHistory:appendSync', { projectId, entry }),
  },

  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', { key, value })
  },

  terminal: {
    input: (sessionId: string, data: string) => {
      ipcRenderer.send('pty:input', { sessionId, data })
    },
    resize: (sessionId: string, cols: number, rows: number) => {
      ipcRenderer.send('pty:resize', { sessionId, cols, rows })
    },
    onOutput: (callback: (sessionId: string, data: string) => void) => {
      const handler = (
        _e: IpcRendererEvent,
        payload: { sessionId: string; data: string }
      ) => callback(payload.sessionId, payload.data)
      ipcRenderer.on('pty:output', handler)
      return () => {
        ipcRenderer.removeListener('pty:output', handler)
      }
    },
    onExit: (callback: (sessionId: string, exitCode: number) => void) => {
      const handler = (
        _e: IpcRendererEvent,
        payload: { sessionId: string; exitCode: number }
      ) => callback(payload.sessionId, payload.exitCode)
      ipcRenderer.on('pty:exit', handler)
      return () => {
        ipcRenderer.removeListener('pty:exit', handler)
      }
    }
  },

  todo: {
    list: (sessionId: string) => ipcRenderer.invoke('todo:list', { sessionId }),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('todo:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('todo:update', input),
    delete: (id: string) => ipcRenderer.invoke('todo:delete', { id })
  },

  template: {
    list: (projectId: string | null) => ipcRenderer.invoke('template:list', { projectId }),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('template:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('template:update', input),
    delete: (id: string) => ipcRenderer.invoke('template:delete', { id })
  },

  workspace: {
    load: (projectId: string) => ipcRenderer.invoke('workspace:load', { projectId }),
    save: (projectId: string, workspace: unknown) =>
      ipcRenderer.invoke('workspace:save', { projectId, workspace })
  },

  claude: {
    onSessionEvent: (
      callback: (event: {
        wsidnSessionId: string
        claudeSessionId: string | null
        source: string
        model: string
      }) => void
    ) => {
      const handler = (
        _e: IpcRendererEvent,
        payload: {
          wsidnSessionId: string
          claudeSessionId: string | null
          source: string
          model: string
        }
      ) => callback(payload)
      ipcRenderer.on('claude:session-event', handler)
      return () => {
        ipcRenderer.removeListener('claude:session-event', handler)
      }
    }
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  }
})
