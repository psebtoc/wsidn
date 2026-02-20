import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { parseClaudeTitle } from '@renderer/utils/claude-activity'
import { useSessionStore } from '@renderer/stores/session-store'
import { useConfigStore } from '@renderer/stores/config-store'


export function useTerminal(
  sessionId: string,
  containerRef: React.RefObject<HTMLDivElement>
) {
  const termRef = useRef<Terminal | null>(null)
  const terminalConfig = useConfigStore((s) => s.config.terminal)

  // Apply config changes to existing terminal
  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.fontSize = terminalConfig.fontSize
    term.options.fontFamily = terminalConfig.fontFamily
    term.options.cursorStyle = terminalConfig.cursorStyle
    term.options.cursorBlink = terminalConfig.cursorBlink
    term.options.scrollback = terminalConfig.scrollback
    term.options.theme = {
      background: terminalConfig.background,
      foreground: terminalConfig.foreground,
    }
  }, [terminalConfig])

  useEffect(() => {
    if (!containerRef.current || !sessionId) return

    const tc = useConfigStore.getState().config.terminal

    const terminal = new Terminal({
      cursorBlink: tc.cursorBlink,
      fontSize: tc.fontSize,
      fontFamily: tc.fontFamily,
      cursorStyle: tc.cursorStyle,
      theme: {
        background: tc.background,
        foreground: tc.foreground,
      },
      scrollback: tc.scrollback,
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

    // OSC title change — parse Claude Code activity from title + persist
    let lastPersistedTitle = ''
    const onTitleDispose = terminal.onTitleChange((title) => {
      const activity = parseClaudeTitle(title)
      if (activity) {
        useSessionStore.getState().updateClaudeActivity(sessionId, activity)

        // Update in-memory title, dedup by stripping spinner char
        const taskText = activity.task
        if (taskText && taskText !== lastPersistedTitle) {
          lastPersistedTitle = taskText
          useSessionStore.getState().updateClaudeLastTitle(sessionId, taskText)
        }
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
