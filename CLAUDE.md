# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WSIDN ("What Should I Do Next") is an Electron desktop app for managing Claude Code sessions with integrated TODO tracking and prompt templates. It provides a terminal-based workspace where users manage multiple PTY sessions per project, track tasks, and use reusable prompt snippets.

## Commands

```bash
pnpm dev          # Start in development mode (electron-vite dev server + Electron)
pnpm build        # Production build (electron-vite build)
pnpm preview      # Preview production build
pnpm typecheck    # TypeScript type checking (tsc --noEmit)
pnpm rebuild      # Rebuild native modules (node-pty) for current Electron version
```

After cloning, run `pnpm install` then `pnpm rebuild` (node-pty requires native compilation).

## Architecture

Three-process Electron app using electron-vite with React + Tailwind CSS in the renderer.

### Process Boundaries

- **Main process** (`src/main/`): Electron main, IPC handlers, PTY management, JSON file storage
- **Preload** (`src/preload/index.ts`): Bridges main↔renderer via `contextBridge`, exposes `window.wsidn` API
- **Renderer** (`src/renderer/`): React app with Zustand stores, services, and components

### IPC Pattern

All IPC channels are defined in `src/main/ipc/channels.ts`. Two communication styles:
- **Request-response** (`ipcMain.handle` / `ipcRenderer.invoke`): Projects, sessions, config, todos, templates — all return `IpcResult<T>` (`{ success, data } | { success, error }`)
- **One-way events** (`ipcMain.on` / `ipcRenderer.send`): PTY input, resize, window controls. PTY output flows back via `webContents.send`.

The preload script (`src/preload/index.ts`) defines the full `window.wsidn` API surface. The renderer type declaration is at `src/renderer/types/electron-api.d.ts`.

### Renderer Data Flow

```
Component → Zustand Store → Service → window.wsidn (preload) → IPC → Main process
```

Services (`src/renderer/services/`) unwrap IPC results using `unwrapIpc()` from `src/renderer/types/ipc.ts`, throwing on failure. Stores (`src/renderer/stores/`) call services and manage UI state.

### Storage

All persistent data lives under `%APPDATA%/wsidn/` (set in `src/main/index.ts`). Structure:
- `config.json` — app-level settings
- `templates.json` — global prompt templates
- `projects/<uuid>/project.json` — project metadata
- `projects/<uuid>/sessions.json` — session records
- `projects/<uuid>/templates.json` — project-scoped templates
- `sessions/<uuid>/todos.json` — session-scoped todos

Storage helpers are in `src/main/storage/storage-manager.ts` (`readJson`, `writeJson`, `getAppDataPath`, `ensureDir`).

### Terminal

`node-pty` spawns system shell processes, managed by the singleton `PtyManager` (`src/main/pty/pty-manager.ts`). The renderer uses xterm.js via the `useTerminal` hook (`src/renderer/hooks/useTerminal.ts`). Each session gets its own PTY instance keyed by session UUID.

### UI Structure

- Frameless window with custom title bar (`TitleBar` with project dropdown + `WindowControls`)
- Two screens: `StartupScreen` (project list/create) and `WorkspaceShell` (active project workspace)
- Workspace layout: main area (`SessionTabBar` + `QuickInsertBar` + `TerminalPane`) | optional side panel (`TodoPanel` / `TemplatePanel`) | `ActivityRibbon` (right edge)
- Custom UI primitives in `src/renderer/components/ui/`: `Checkbox` (3-state), `Radio`, `Tooltip` (portal-based)

### Path Aliases

- `@main/*` → `src/main/*`
- `@renderer/*` → `src/renderer/*`

Configured in both `tsconfig.json` (paths) and `electron.vite.config.ts` (resolve aliases).

## Key Domain Types

Defined in `src/renderer/types/project.ts`: `Project`, `Session`, `Todo` (session-scoped, with hierarchical `parentId`), `PromptTemplate` (global or project-scoped).

### Session Fields

- `claudeSessionId` — bound by hook-server when Claude Code starts (cleared on stop)
- `claudeLastTitle` — last OSC title task text, persisted to `sessions.json` for resume display
- `claudeModel` — model name from Claude session event

### Project Fields

- `worktreeInitScript` — optional shell command run before `claude` in worktree sessions (e.g. `pnpm install`)

## Session Creation Features

PaneView's `+` button is a **split button**: `[+]` creates a plain terminal, `[▾]` opens a context menu (`SessionContextMenu.tsx`) with options:
- `claude` / `claude --dangerously-skip-permissions` — creates session then sends command
- **Worktree** — opens `WorktreeBranchDialog.tsx`, runs `git worktree add`, spawns PTY in new path
- **Resume** — cascading submenu listing closed sessions with `claudeSessionId`, sends `claude --resume <session-id>`

Command injection into new sessions uses **PTY output detection** (waits for first shell output) instead of a fixed delay, ensuring the shell prompt is ready before sending input.

### Claude Code CLI Notes

- Resume syntax: `claude --resume <session-id>` (NOT `--session-id` flag, which requires `--fork-session`)
- Skip permissions: `claude --dangerously-skip-permissions`

## IPC Channel Conventions

When adding new IPC channels, update all 5 layers:
1. `src/main/ipc/channels.ts` — channel constant
2. `src/main/pty/pty-ipc.ts` — `ipcMain.handle` handler
3. `src/preload/index.ts` — bridge function
4. `src/renderer/types/electron-api.d.ts` — type declaration
5. `src/renderer/services/session-service.ts` — service method

**Important**: preload/main changes require full `pnpm dev` restart (no HMR).

## Tech Stack

- **Runtime**: Electron 33 + Node
- **Build**: electron-vite (Vite-based), electron-builder for packaging
- **Frontend**: React 18, Zustand (state), Tailwind CSS 3
- **Terminal**: node-pty (native), @xterm/xterm with fit + web-links addons
- **Package manager**: pnpm (shamefully-hoist=true via .npmrc)
- **Target**: Windows (nsis installer)
