import * as pty from 'node-pty'
import type { IPty } from 'node-pty'
import { BrowserWindow } from 'electron'

class PtyManager {
  private registry = new Map<string, IPty>()
  private mainWindow: BrowserWindow | null = null

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
  }

  spawn(sessionId: string, cwd: string): void {
    if (this.registry.has(sessionId)) {
      console.warn(`[PtyManager] Session already exists: ${sessionId}`)
      return
    }

    const shell = process.env.COMSPEC || 'cmd.exe'

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd,
      env: { ...process.env, WSIDN_PTY_ID: sessionId } as Record<string, string>,
      useConpty: true
    })

    ptyProcess.onData((data) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('pty:output', { sessionId, data })
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      this.registry.delete(sessionId)
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('pty:exit', { sessionId, exitCode })
      }
    })

    this.registry.set(sessionId, ptyProcess)
  }

  write(sessionId: string, data: string): void {
    const p = this.registry.get(sessionId)
    if (!p) {
      console.warn(`[PtyManager] Session not found for write: ${sessionId}`)
      return
    }
    p.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const p = this.registry.get(sessionId)
    if (!p) {
      console.warn(`[PtyManager] Session not found for resize: ${sessionId}`)
      return
    }
    p.resize(cols, rows)
  }

  kill(sessionId: string): void {
    const p = this.registry.get(sessionId)
    if (!p) {
      console.warn(`[PtyManager] Session not found for kill: ${sessionId}`)
      return
    }
    p.kill()
    this.registry.delete(sessionId)
  }

  killAll(): void {
    for (const [sessionId, p] of this.registry) {
      p.kill()
      this.registry.delete(sessionId)
    }
  }
}

export const ptyManager = new PtyManager()
