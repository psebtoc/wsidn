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
  ProjectSessions,
  WorkspaceState
} from './project'

export interface WsidnAPI {
  project: {
    create: (name: string, path: string) => Promise<IpcResult<Project>>
    list: () => Promise<IpcResult<Project[]>>
    delete: (projectId: string) => Promise<IpcResult<boolean>>
    selectDir: () => Promise<IpcResult<string | null>>
  }
  session: {
    create: (projectId: string, cwd: string) => Promise<IpcResult<Session>>
    close: (sessionId: string) => Promise<IpcResult<boolean>>
    list: (projectId: string) => Promise<IpcResult<Session[]>>
    listAll: () => Promise<IpcResult<ProjectSessions[]>>
    updateTitle: (sessionId: string, title: string) => Promise<IpcResult<boolean>>
    createWorktree: (
      projectId: string,
      cwd: string,
      branchName: string
    ) => Promise<IpcResult<{ session: Session; worktreePath: string; initScript: string | null }>>
    spawn: (sessionId: string, cwd: string) => Promise<IpcResult<boolean>>
    clearStale: (projectId: string) => Promise<IpcResult<boolean>>
    rename: (sessionId: string, name: string) => Promise<IpcResult<boolean>>
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
    list: (sessionId: string) => Promise<IpcResult<Todo[]>>
    create: (input: CreateTodoInput) => Promise<IpcResult<Todo>>
    update: (input: UpdateTodoInput) => Promise<IpcResult<Todo>>
    delete: (id: string) => Promise<IpcResult<boolean>>
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
