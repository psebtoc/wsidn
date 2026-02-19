export interface Project {
  id: string
  name: string
  path: string
  createdAt: string
  worktreeInitScript: string | null
}

export interface Session {
  id: string
  projectId: string
  name: string
  cwd: string
  status: 'active' | 'closed'
  createdAt: string
  claudeSessionId: string | null
  claudeModel: string | null
  claudeLastTitle: string | null
  lastClaudeSessionId: string | null
}

export interface ClaudeActivity {
  status: 'idle' | 'working'
  task: string
}

export type ClaudeHookSource = 'startup' | 'resume' | 'clear' | 'compact' | 'stop'

export interface ClaudeSessionEvent {
  wsidnSessionId: string
  claudeSessionId: string | null
  source: ClaudeHookSource
  model: string
}

export interface ProjectSessions {
  project: { id: string; name: string }
  sessions: Session[]
}

export interface AppConfig {
  theme: 'dark' | 'light'
  defaultShell: string
}

// --- Phase 2: TODO ---

export type TodoStatus = 'pending' | 'in_progress' | 'done'
export type TodoPriority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  sessionId: string
  title: string
  description: string
  status: TodoStatus
  priority: TodoPriority
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface CreateTodoInput {
  sessionId: string
  title: string
  description?: string
  priority?: TodoPriority
  parentId?: string | null
}

export interface UpdateTodoInput {
  id: string
  sessionId?: string
  title?: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  parentId?: string | null
  order?: number
}

// --- Split Layout ---

export type SplitDirection = 'horizontal' | 'vertical'

export interface Pane {
  id: string
  name: string
  sessionIds: string[]
  activeSessionId: string | null
}

export interface MinimizedPane {
  paneId: string
  siblingPaneId: string | null
  direction: SplitDirection
  paneWasFirst: boolean
}

export interface WorkspaceState {
  version: 1
  panes: Pane[]
  splitLayout: SplitNode | null
  focusedPaneId: string | null
  minimizedPanes: MinimizedPane[]
}

export interface SplitLeaf {
  type: 'leaf'
  paneId: string
}

export interface SplitBranch {
  type: 'branch'
  direction: SplitDirection
  ratio: number
  first: SplitNode
  second: SplitNode
}

export type SplitNode = SplitLeaf | SplitBranch

// --- Phase 2: Prompt Template ---

export type TemplateScope = 'global' | 'project'

export interface PromptTemplate {
  id: string
  title: string
  content: string
  scope: TemplateScope
  projectId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateInput {
  title: string
  content: string
  scope: TemplateScope
  projectId?: string | null
}

export interface UpdateTemplateInput {
  id: string
  title?: string
  content?: string
}
