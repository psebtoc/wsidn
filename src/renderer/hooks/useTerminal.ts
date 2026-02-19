import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { parseClaudeTitle } from '@renderer/utils/claude-activity'
import { useSessionStore } from '@renderer/stores/session-store'

export function useTerminal(
  sessionId: string,
  containerRef: React.RefObject<HTMLDivElement>
) {
  const termRef = useRef<Terminal | null>(null)

  useEffect(() => {
    if (!containerRef.current || !sessionId) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#e0e0e0'
      },
      scrollback: 5000
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())
    terminal.open(containerRef.current)
    fitAddon.fit()
    termRef.current = terminal

    // User input -> PTY
    const onDataDispose = terminal.onData((data) => {
      window.wsidn.terminal.input(sessionId, data)
    })

    // PTY output -> terminal
    const removeOutput = window.wsidn.terminal.onOutput((sid, data) => {
      if (sid === sessionId) terminal.write(data)
    })

    // OSC title change — parse Claude Code activity from title
    const onTitleDispose = terminal.onTitleChange((title) => {
      const activity = parseClaudeTitle(title)
      if (activity) {
        useSessionStore.getState().updateClaudeActivity(sessionId, activity)
      }
    })

    // Resize
    const observer = new ResizeObserver(() => {
      fitAddon.fit()
      window.wsidn.terminal.resize(sessionId, terminal.cols, terminal.rows)
    })
    observer.observe(containerRef.current)

    return () => {
      removeOutput()
      onDataDispose.dispose()
      onTitleDispose.dispose()
      observer.disconnect()
      terminal.dispose()
      termRef.current = null
    }
  }, [sessionId])

  return termRef
}
