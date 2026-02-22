export type ShortcutAction =
  | 'create-session'
  | 'switch-tab-next'
  | 'switch-tab-prev'
  | 'switch-pane-next'
  | 'switch-pane-prev'
  | 'minimize-pane'
  | 'toggle-mindtree'
  | 'create-task'
  | 'create-decision'

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  'create-session': 'ctrl+t',
  'switch-tab-next': 'ctrl+right',
  'switch-tab-prev': 'ctrl+left',
  'switch-pane-next': 'ctrl+alt+right',
  'switch-pane-prev': 'ctrl+alt+left',
  'minimize-pane': 'ctrl+m',
  'toggle-mindtree': 'ctrl+shift+t',
  'create-task': 'ctrl+shift+k',
  'create-decision': 'ctrl+shift+d',
}

// Arrow key aliases: shortcut string → event.key.toLowerCase()
const KEY_ALIASES: Record<string, string> = {
  right: 'arrowright',
  left: 'arrowleft',
  up: 'arrowup',
  down: 'arrowdown',
}

interface ParsedShortcut {
  ctrl: boolean
  shift: boolean
  alt: boolean
  key: string
}

function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split('+')
  const rawKey = parts[parts.length - 1]
  const key = KEY_ALIASES[rawKey] ?? rawKey
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key,
  }
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  return (
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.key.toLowerCase() === parsed.key
  )
}

// Module-level registry — updated by config-store when shortcuts change
let _shortcuts: Record<string, string> = { ...DEFAULT_SHORTCUTS }

export function updateShortcutRegistry(shortcuts: Record<string, string>): void {
  _shortcuts = { ...DEFAULT_SHORTCUTS, ...shortcuts }
}

export function matchAction(event: KeyboardEvent, action: ShortcutAction): boolean {
  const shortcut = _shortcuts[action] ?? DEFAULT_SHORTCUTS[action]
  return matchesShortcut(event, shortcut)
}

export function isRegisteredShortcut(event: KeyboardEvent): boolean {
  return Object.values(_shortcuts).some((shortcut) => matchesShortcut(event, shortcut))
}

/** Format a shortcut string for display, e.g. "ctrl+shift+t" → "Ctrl+Shift+T" */
export function formatShortcut(shortcut: string): string {
  return shortcut
    .split('+')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('+')
}
