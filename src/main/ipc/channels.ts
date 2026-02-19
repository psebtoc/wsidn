export const IPC_CHANNELS = {
  // PTY (stream, one-way events)
  PTY_INPUT: 'pty:input',
  PTY_OUTPUT: 'pty:output',
  PTY_RESIZE: 'pty:resize',
  PTY_EXIT: 'pty:exit',

  // Session (request-response)
  SESSION_CREATE: 'session:create',
  SESSION_CLOSE: 'session:close',
  SESSION_LIST: 'session:list',
  SESSION_LIST_ALL: 'session:listAll',
  SESSION_UPDATE_TITLE: 'session:updateTitle',
  SESSION_CREATE_WORKTREE: 'session:createWorktree',
  SESSION_SPAWN: 'session:spawn',
  SESSION_CLEAR_STALE: 'session:clearStale',
  SESSION_RENAME: 'session:rename',

  // Project (request-response)
  PROJECT_CREATE: 'project:create',
  PROJECT_LIST: 'project:list',
  PROJECT_DELETE: 'project:delete',
  PROJECT_SELECT_DIR: 'project:selectDir',

  // Config
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',

  // TODO
  TODO_LIST: 'todo:list',
  TODO_CREATE: 'todo:create',
  TODO_UPDATE: 'todo:update',
  TODO_DELETE: 'todo:delete',

  // Template
  TEMPLATE_LIST: 'template:list',
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_UPDATE: 'template:update',
  TEMPLATE_DELETE: 'template:delete',

  // Workspace
  WORKSPACE_LOAD: 'workspace:load',
  WORKSPACE_SAVE: 'workspace:save',

  // Claude session binding (main → renderer, one-way)
  CLAUDE_SESSION_EVENT: 'claude:session-event',

  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const
