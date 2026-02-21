export interface Project {
  id: string
  name: string
  path: string
  createdAt: string
}

export interface Session {
  id: string
  projectId: string
  name: string
  cwd: string
  createdAt: string
  claudeSessionId: string | null
  claudeModel: string | null
  claudeLastTitle: string | null
  lastClaudeSessionId: string | null
  worktreeName: string | null
}

export interface ResumeHistoryEntry {
  claudeSessionId: string
  sessionName: string
  claudeLastTitle: string | null
  closedAt: string
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

export interface TerminalConfig {
  fontSize: number
  fontFamily: string
  cursorStyle: 'block' | 'underline' | 'bar'
  cursorBlink: boolean
  scrollback: number
}

export interface TerminalColorOverride {
  background?: string
  foreground?: string
}

export interface AppConfig {
  theme: string
  accentColor: string | null
  terminalColors: Record<string, TerminalColorOverride>
  defaultShell: string
  terminal: TerminalConfig
  language: 'ko' | 'en'
  sessionManager: {
    model: 'haiku' | 'sonnet' | 'opus'
  }
}

// --- Mind Tree ---

export type MindTreeCategory = 'task' | 'decision' | 'note'
export type TodoStatus = 'pending' | 'in_progress' | 'done' | 'blocked'
export type TodoPriority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  sessionId: string
  category: MindTreeCategory
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
  projectId: string
  sessionId: string
  title: string
  category?: MindTreeCategory
  description?: string
  priority?: TodoPriority
  parentId?: string | null
}

export interface UpdateTodoInput {
  id: string
  projectId?: string
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

/** @deprecated v1 format — kept for migration only */
export interface MinimizedPaneV1 {
  paneId: string
  siblingPaneId: string | null
  direction: SplitDirection
  paneWasFirst: boolean
}

/** v1 workspace — used for migration detection */
export interface WorkspaceStateV1 {
  version: 1
  panes: Pane[]
  splitLayout: SplitNode | null
  focusedPaneId: string | null
  minimizedPanes: MinimizedPaneV1[]
}

export interface WorkspaceState {
  version: 2
  panes: Pane[]
  splitLayout: SplitNode | null
  focusedPaneId: string | null
  minimizedPaneIds: string[]
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
