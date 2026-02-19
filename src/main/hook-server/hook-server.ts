import http from 'http'
import { BrowserWindow } from 'electron'
import { existsSync, readdirSync } from 'fs'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { getAppDataPath, readJson, writeJson } from '@main/storage/storage-manager'

interface SessionRecord {
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

interface HookPayload {
  wsidn_session_id: string
  claude_session_id: string | null
  source: string
  model: string
}

class HookServer {
  private server: http.Server | null = null
  private mainWindow: BrowserWindow | null = null
  private port: number | null = null

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.method === 'POST' && (req.url === '/hook/session-start' || req.url === '/hook/session-stop')) {
          const isStop = req.url === '/hook/session-stop'
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body) as HookPayload
              if (isStop) {
                this.handleSessionStop(payload)
              } else {
                this.handleSessionStart(payload)
              }
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end('{"ok":true}')
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end('{"error":"invalid payload"}')
            }
          })
        } else {
          res.writeHead(404)
          res.end()
        }
      })

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address()
        if (addr && typeof addr === 'object') {
          this.port = addr.port
          // Write port file so hook script can discover us
          writeJson(getAppDataPath('hook-server-port.json'), {
            port: this.port,
            pid: process.pid
          })
          console.log(`[HookServer] listening on 127.0.0.1:${this.port}`)
          resolve()
        } else {
          reject(new Error('Failed to get server address'))
        }
      })

      this.server.on('error', reject)
    })
  }

  stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  private handleSessionStart(payload: HookPayload): void {
    const { wsidn_session_id, claude_session_id, source, model } = payload

    // Update sessions.json on disk
    this.updateSessionRecord(wsidn_session_id, claude_session_id, model)

    // Push event to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_SESSION_EVENT, {
        wsidnSessionId: wsidn_session_id,
        claudeSessionId: claude_session_id,
        source,
        model
      })
    }
  }

  private handleSessionStop(payload: HookPayload): void {
    const { wsidn_session_id } = payload

    // Preserve claudeSessionId into lastClaudeSessionId, then clear binding
    this.preserveAndClearClaudeBinding(wsidn_session_id)

    // Push stop event to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_SESSION_EVENT, {
        wsidnSessionId: wsidn_session_id,
        claudeSessionId: null,
        source: 'stop',
        model: ''
      })
    }
  }

  private updateSessionRecord(
    wsidnSessionId: string,
    claudeSessionId: string | null,
    model: string
  ): void {
    const projectsDir = getAppDataPath('projects')
    if (!existsSync(projectsDir)) return

    for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const filePath = getAppDataPath('projects', entry.name, 'sessions.json')
      const sessions = readJson<SessionRecord[]>(filePath, [])
      const session = sessions.find((s) => s.id === wsidnSessionId)
      if (session) {
        session.claudeSessionId = claudeSessionId
        session.claudeModel = model
        if (claudeSessionId) {
          session.lastClaudeSessionId = claudeSessionId
        }
        writeJson(filePath, sessions)
        break
      }
    }
  }

  private preserveAndClearClaudeBinding(wsidnSessionId: string): void {
    const projectsDir = getAppDataPath('projects')
    if (!existsSync(projectsDir)) return

    for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const filePath = getAppDataPath('projects', entry.name, 'sessions.json')
      const sessions = readJson<SessionRecord[]>(filePath, [])
      const session = sessions.find((s) => s.id === wsidnSessionId)
      if (session) {
        if (session.claudeSessionId) {
          session.lastClaudeSessionId = session.claudeSessionId
        }
        session.claudeSessionId = null
        session.claudeModel = null
        writeJson(filePath, sessions)
        break
      }
    }
  }
}

export const hookServer = new HookServer()
