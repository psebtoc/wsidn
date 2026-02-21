import type { IpcResult } from './ipc'
import type {
  Project,
  Session,
  AppConfig,
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  PromptTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  ClaudeSessionEvent,
  ResumeHistoryEntry,
  WorkspaceState
} from './project'

export interface WsidnAPI {
  project: {
    create: (name: string, path: string) => Promise<IpcResult<Project>>
    list: () => Promise<IpcResult<Project[]>>
    delete: (projectId: string) => Promise<IpcResult<boolean>>
    update: (projectId: string, data: Record<string, unknown>) => Promise<IpcResult<Project>>
    selectDir: () => Promise<IpcResult<string | null>>
  }
  session: {
    close: (sessionId: string) => Promise<IpcResult<boolean>>
    spawn: (sessionId: string, cwd: string) => Promise<IpcResult<boolean>>
  }
  resumeHistory: {
    list: (projectId: string) => Promise<IpcResult<ResumeHistoryEntry[]>>
    append: (
      projectId: string,
      entry: {
        claudeSessionId: string
        sessionName: string
        claudeLastTitle: string | null
        closedAt: string
      }
    ) => Promise<IpcResult<boolean>>
    appendSync: (
      projectId: string,
      entry: {
        claudeSessionId: string
        sessionName: string
        claudeLastTitle: string | null
        closedAt: string
      }
    ) => boolean
  }
  config: {
    get: () => Promise<IpcResult<AppConfig>>
    set: (key: string, value: unknown) => Promise<IpcResult<boolean>>
  }
  terminal: {
    input: (sessionId: string, data: string) => void
    resize: (sessionId: string, cols: number, rows: number) => void
    onOutput: (callback: (sessionId: string, data: string) => void) => () => void
    onExit: (callback: (sessionId: string, exitCode: number) => void) => () => void
  }
  todo: {
    list: (projectId: string, sessionId: string) => Promise<IpcResult<Todo[]>>
    create: (input: CreateTodoInput) => Promise<IpcResult<Todo>>
    update: (input: UpdateTodoInput) => Promise<IpcResult<Todo>>
    delete: (projectId: string, sessionId: string, id: string) => Promise<IpcResult<boolean>>
  }
  template: {
    list: (projectId: string | null) => Promise<IpcResult<PromptTemplate[]>>
    create: (input: CreateTemplateInput) => Promise<IpcResult<PromptTemplate>>
    update: (input: UpdateTemplateInput) => Promise<IpcResult<PromptTemplate>>
    delete: (id: string) => Promise<IpcResult<boolean>>
  }
  workspace: {
    load: (projectId: string) => Promise<IpcResult<WorkspaceState | null>>
    save: (projectId: string, workspace: WorkspaceState) => Promise<IpcResult<boolean>>
  }
  claude: {
    onSessionEvent: (callback: (event: ClaudeSessionEvent) => void) => () => void
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
}

declare global {
  interface Window {
    wsidn: WsidnAPI
  }
}
