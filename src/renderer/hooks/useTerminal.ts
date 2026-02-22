import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Terminal, ILinkProvider, ILink } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { parseClaudeTitle } from '@renderer/utils/claude-activity'
import { useSessionStore } from '@renderer/stores/session-store'
import { useConfigStore } from '@renderer/stores/config-store'
import { getThemePreset } from '@renderer/themes/theme-presets'
import { isRegisteredShortcut } from '@renderer/utils/shortcut-registry'

// --- Link hover tooltip helpers ---
let tooltipEl: HTMLDivElement | null = null

function showLinkTooltip(event: MouseEvent, text: string): void {
  hideLinkTooltip()
  const el = document.createElement('div')
  el.className = 'xterm-hover'
  el.textContent = text
  Object.assign(el.style, {
    position: 'fixed',
    left: `${event.clientX + 4}px`,
    top: `${event.clientY - 28}px`,
    background: '#252526',
    color: '#cccccc',
    padding: '2px 8px',
    borderRadius: '3px',
    border: '1px solid #454545',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    pointerEvents: 'none',
    zIndex: '10000',
    whiteSpace: 'nowrap',
  })
  document.body.appendChild(el)
  tooltipEl = el
}

function hideLinkTooltip(): void {
  if (tooltipEl) {
    tooltipEl.remove()
    tooltipEl = null
  }
}

// Windows absolute path: C:\... or C:/...
const WIN_PATH_RE = /[A-Za-z]:[/\\][^\s"'`<>|*?]+/g

/** Creates a link provider that detects local file paths in terminal output */
function createPathLinkProvider(
  terminal: Terminal,
  onHover: (event: MouseEvent) => void,
  onLeave: () => void
): ILinkProvider {
  return {
    provideLinks(y: number, callback: (links: ILink[] | undefined) => void) {
      // y from provideLinks is 1-based buffer line; getLine takes 0-based index
      const line = terminal.buffer.active.getLine(y - 1)
      if (!line) { callback(undefined); return }

      const text = line.translateToString()
      const links: ILink[] = []
      let match: RegExpExecArray | null
      WIN_PATH_RE.lastIndex = 0
      while ((match = WIN_PATH_RE.exec(text)) !== null) {
        const startX = match.index
        const path = match[0]
        links.push({
          range: {
            start: { x: startX + 1, y },
            end: { x: startX + path.length + 1, y },
          },
          text: path,
          activate(event: MouseEvent) {
            if (event.ctrlKey) window.wsidn.shell.openPath(path)
          },
          hover(event: MouseEvent) { onHover(event) },
          leave() { onLeave() },
        })
      }
      callback(links.length > 0 ? links : undefined)
    },
  }
}

export function useTerminal(
  sessionId: string,
  containerRef: React.RefObject<HTMLDivElement>,
  isActive: boolean
) {
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const { t } = useTranslation()
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive
  const resizingRef = useRef(false)
  const resizeBufferRef = useRef('')
  const resizeFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const terminalConfig = useConfigStore((s) => s.config.terminal)
  const themeId = useConfigStore((s) => s.config.theme)
  const terminalColors = useConfigStore((s) => s.config.terminalColors)

  // Apply config changes to existing terminal (including theme-driven colors)
  useEffect(() => {
    const term = termRef.current
    if (!term) return
    const preset = getThemePreset(themeId)
    const overrides = terminalColors[themeId]
    const bg = overrides?.background ?? preset.colors.terminalBg
    const fg = overrides?.foreground ?? preset.colors.terminalFg
    term.options.fontSize = terminalConfig.fontSize
    term.options.fontFamily = terminalConfig.fontFamily
    term.options.cursorStyle = terminalConfig.cursorStyle
    term.options.cursorBlink = terminalConfig.cursorBlink
    term.options.scrollback = terminalConfig.scrollback
    term.options.theme = {
      background: bg,
      foreground: fg,
      cursor: fg,
      cursorAccent: bg,
      selectionBackground: '#ffffff40',
    }
  }, [terminalConfig, themeId, terminalColors])

  useEffect(() => {
    if (!containerRef.current || !sessionId) return

    const cfg = useConfigStore.getState().config
    const tc = cfg.terminal
    const preset = getThemePreset(cfg.theme)
    const overrides = cfg.terminalColors[cfg.theme]
    const initBg = overrides?.background ?? preset.colors.terminalBg
    const initFg = overrides?.foreground ?? preset.colors.terminalFg

    const terminal = new Terminal({
      cursorBlink: tc.cursorBlink,
      fontSize: tc.fontSize,
      fontFamily: tc.fontFamily,
      cursorStyle: tc.cursorStyle,
      theme: {
        background: initBg,
        foreground: initFg,
        cursor: initFg,
        cursorAccent: initBg,
        selectionBackground: '#ffffff40',
      },
      scrollback: tc.scrollback,
      windowsPty: {
        backend: 'conpty',
        buildNumber: 21376,
      },
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(
      new WebLinksAddon(
        (event, uri) => {
          if (event.ctrlKey) window.wsidn.shell.openExternal(uri)
        },
        {
          hover: (event) => {
            showLinkTooltip(event, t('terminal.linkTooltip'))
          },
          leave: () => {
            hideLinkTooltip()
          },
        }
      )
    )

    // Local file path link provider (Windows paths like C:\...)
    const pathLinkDispose = terminal.registerLinkProvider(
      createPathLinkProvider(
        terminal,
        (event) => showLinkTooltip(event, t('terminal.pathTooltip')),
        () => hideLinkTooltip()
      )
    )

    terminal.open(containerRef.current)

    // Ctrl+C (copy when selected, SIGINT otherwise) / Ctrl+V (paste)
    terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.type !== 'keydown') return true

      if (event.ctrlKey && !event.shiftKey && !event.altKey) {
        if (event.key === 'c') {
          if (terminal.hasSelection()) {
            navigator.clipboard.writeText(terminal.getSelection())
            terminal.clearSelection()
            return false
          }
          return true
        }
        if (event.key === 'v') {
          navigator.clipboard.readText().then((text) => {
            if (text) terminal.paste(text)
          })
          return false
        }
      }

      // Block registered keyboard shortcuts from reaching the PTY
      if (isRegisteredShortcut(event)) return false

      return true
    })

    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      fitAddon.fit()
    }
    termRef.current = terminal
    fitAddonRef.current = fitAddon

    // User input -> PTY
    const onDataDispose = terminal.onData((data) => {
      window.wsidn.terminal.input(sessionId, data)
    })

    // PTY output -> terminal (buffered during resize to avoid ConPTY double-reflow)
    const removeOutput = window.wsidn.terminal.onOutput((sid, data) => {
      if (sid === sessionId) {
        if (resizingRef.current) {
          resizeBufferRef.current += data
        } else {
          terminal.write(data)
        }
      }
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

    // Resize — only for ACTIVE terminal, debounced.
    // Hidden terminals skip resize to avoid ConPTY output flood;
    // they get a one-time fit when they become active (see isActive effect below).
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width === 0 || height === 0) return
      if (!isActiveRef.current) return // skip hidden terminals

      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const prevCols = terminal.cols
        const prevRows = terminal.rows

        // Cancel pending flush from previous resize cycle
        if (resizeFlushTimerRef.current) {
          clearTimeout(resizeFlushTimerRef.current)
          resizeFlushTimerRef.current = null
        }

        // Start buffering ConPTY output to prevent double-reflow corruption
        resizingRef.current = true
        resizeBufferRef.current = ''

        fitAddon.fit()

        // Only notify PTY if dimensions actually changed
        if (terminal.cols !== prevCols || terminal.rows !== prevRows) {
          window.wsidn.terminal.resize(sessionId, terminal.cols, terminal.rows)
        }

        // Flush after ConPTY repaint completes
        resizeFlushTimerRef.current = setTimeout(() => {
          resizingRef.current = false
          if (resizeBufferRef.current) {
            terminal.write(resizeBufferRef.current)
          }
          resizeBufferRef.current = ''
          resizeFlushTimerRef.current = null
        }, 150)
      }, 50)
    })
    observer.observe(containerRef.current)

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      if (resizeFlushTimerRef.current) {
        clearTimeout(resizeFlushTimerRef.current)
        resizeFlushTimerRef.current = null
      }
      // Drain any buffered output before dispose
      resizingRef.current = false
      if (resizeBufferRef.current) {
        terminal.write(resizeBufferRef.current)
        resizeBufferRef.current = ''
      }
      hideLinkTooltip()
      pathLinkDispose.dispose()
      removeOutput()
      onDataDispose.dispose()
      onTitleDispose.dispose()
      observer.disconnect()
      terminal.dispose()
      termRef.current = null
      fitAddonRef.current = null
    }
  }, [sessionId])

  // When this terminal becomes active, fit to current container size.
  // This catches any resize that happened while it was hidden.
  useEffect(() => {
    if (!isActive) return
    const terminal = termRef.current
    const fitAddon = fitAddonRef.current
    const container = containerRef.current
    if (!terminal || !fitAddon || !container) return

    const rect = container.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      const prevCols = terminal.cols
      const prevRows = terminal.rows

      // Cancel pending flush from previous resize cycle
      if (resizeFlushTimerRef.current) {
        clearTimeout(resizeFlushTimerRef.current)
        resizeFlushTimerRef.current = null
      }

      // Start buffering ConPTY output to prevent double-reflow corruption
      resizingRef.current = true
      resizeBufferRef.current = ''

      fitAddon.fit()

      if (terminal.cols !== prevCols || terminal.rows !== prevRows) {
        window.wsidn.terminal.resize(sessionId, terminal.cols, terminal.rows)
      }

      // Flush after ConPTY repaint completes
      resizeFlushTimerRef.current = setTimeout(() => {
        resizingRef.current = false
        if (resizeBufferRef.current) {
          terminal.write(resizeBufferRef.current)
        }
        resizeBufferRef.current = ''
        resizeFlushTimerRef.current = null
      }, 150)
    }
  }, [isActive, sessionId])

  return termRef
}
