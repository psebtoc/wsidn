export const IPC_CHANNELS = {
  // PTY (stream, one-way events)
  PTY_INPUT: 'pty:input',
  PTY_OUTPUT: 'pty:output',
  PTY_RESIZE: 'pty:resize',
  PTY_EXIT: 'pty:exit',

  // Session (request-response) — runtime PTY management only
  SESSION_CLOSE: 'session:close',
  SESSION_SPAWN: 'session:spawn',

  // Resume history
  RESUME_HISTORY_LIST: 'resumeHistory:list',
  RESUME_HISTORY_APPEND: 'resumeHistory:append',
  RESUME_HISTORY_APPEND_SYNC: 'resumeHistory:appendSync',

  // Project (request-response)
  PROJECT_CREATE: 'project:create',
  PROJECT_LIST: 'project:list',
  PROJECT_DELETE: 'project:delete',
  PROJECT_UPDATE: 'project:update',
  PROJECT_SELECT_DIR: 'project:selectDir',

  // Config
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',

  // TODO
  TODO_LIST: 'todo:list',
  TODO_CREATE: 'todo:create',
  TODO_UPDATE: 'todo:update',
  TODO_DELETE: 'todo:delete',
  MINDTREE_COPY: 'mindtree:copy',

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

  // Session Manager
  SESSION_MANAGER_SET_ENABLED: 'sessionManager:setEnabled',
  SESSION_MANAGER_GET_STATUS: 'sessionManager:getStatus',
  SESSION_MANAGER_UPDATED: 'sessionManager:updated',
  SESSION_MANAGER_PROCESSING: 'sessionManager:processing',

  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const
