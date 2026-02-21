import http from 'http'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@main/ipc/channels'
import { getAppDataPath, writeJson } from '@main/storage/storage-manager'
import { sessionManager } from '@main/session-manager/session-manager'

interface HookPayload {
  wsidn_session_id: string
  claude_session_id: string | null
  source: string
  model: string
}

interface PromptSubmitPayload {
  wsidn_session_id: string
  prompt: string
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
        if (req.method === 'POST' && req.url) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              if (req.url === '/hook/session-start' || req.url === '/hook/session-stop') {
                const isStop = req.url === '/hook/session-stop'
                const payload = JSON.parse(body) as HookPayload
                if (isStop) {
                  this.handleSessionStop(payload)
                } else {
                  this.handleSessionStart(payload)
                }
              } else if (req.url === '/hook/prompt-submit') {
                const payload = JSON.parse(body) as PromptSubmitPayload
                this.handlePromptSubmit(payload)
              } else {
                res.writeHead(404)
                res.end()
                return
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
    console.log(`[HookServer] session-start: wsidnId=${wsidn_session_id} claudeId=${claude_session_id} source=${source} model=${model}`)

    // Keep session manager's claudeSessionId in sync
    sessionManager.updateClaudeSession(wsidn_session_id, claude_session_id)

    // Push event to renderer (no disk operations)
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
    console.log(`[HookServer] session-stop: wsidnId=${wsidn_session_id}`)

    // Keep session manager's claudeSessionId in sync
    sessionManager.updateClaudeSession(wsidn_session_id, null)

    // Push stop event to renderer (no disk operations)
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_SESSION_EVENT, {
        wsidnSessionId: wsidn_session_id,
        claudeSessionId: null,
        source: 'stop',
        model: ''
      })
    }
  }

  private handlePromptSubmit(payload: PromptSubmitPayload): void {
    const { wsidn_session_id, prompt } = payload
    console.log(`[HookServer] prompt-submit: wsidnId=${wsidn_session_id} prompt="${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`)
    sessionManager.onPromptSubmit(wsidn_session_id, prompt)
  }
}

export const hookServer = new HookServer()
