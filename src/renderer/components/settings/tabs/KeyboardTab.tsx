import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_SHORTCUTS, formatShortcut, matchesShortcut } from '@renderer/utils/shortcut-registry'
import type { ShortcutAction } from '@renderer/utils/shortcut-registry'

interface KeyboardTabProps {
  shortcuts: Record<string, string>
  onShortcutsChange: (shortcuts: Record<string, string>) => void
}

const ACTION_ORDER: ShortcutAction[] = [
  'create-session',
  'switch-tab-next',
  'switch-tab-prev',
  'switch-pane-next',
  'switch-pane-prev',
  'minimize-pane',
  'toggle-mindtree',
  'create-task',
  'create-decision',
]

export default function KeyboardTab({ shortcuts, onShortcutsChange }: KeyboardTabProps) {
  const { t } = useTranslation()
  const [recording, setRecording] = useState<ShortcutAction | null>(null)
  const recordingRef = useRef(recording)
  recordingRef.current = recording

  useEffect(() => {
    if (!recording) return

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Ignore modifier-only keypresses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

      const parts: string[] = []
      if (e.ctrlKey) parts.push('ctrl')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey) parts.push('alt')

      // Normalize key name
      const keyMap: Record<string, string> = {
        ArrowRight: 'right',
        ArrowLeft: 'left',
        ArrowUp: 'up',
        ArrowDown: 'down',
      }
      parts.push(keyMap[e.key] ?? e.key.toLowerCase())

      const newShortcut = parts.join('+')
      onShortcutsChange({ ...shortcuts, [recordingRef.current!]: newShortcut })
      setRecording(null)
    }

    const cancelHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setRecording(null)
      }
    }

    window.addEventListener('keydown', handler, true)
    window.addEventListener('keydown', cancelHandler)
    return () => {
      window.removeEventListener('keydown', handler, true)
      window.removeEventListener('keydown', cancelHandler)
    }
  }, [recording, shortcuts, onShortcutsChange])

  const handleReset = () => {
    onShortcutsChange({})
  }

  const getShortcutDisplay = (action: ShortcutAction): string => {
    const current = shortcuts[action] ?? DEFAULT_SHORTCUTS[action]
    return formatShortcut(current)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-medium text-fg-muted uppercase tracking-wider">
          {t('settings.tabs.keyboard')}
        </h3>
        <button
          onClick={handleReset}
          className="text-xs text-fg-dim hover:text-fg-secondary transition-colors"
        >
          {t('shortcuts.resetToDefaults')}
        </button>
      </div>

      <div className="space-y-1">
        {ACTION_ORDER.map((action) => {
          const isRecording = recording === action
          return (
            <div
              key={action}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-elevated/30 transition-colors"
            >
              <span className="text-sm text-fg-secondary">
                {t(`shortcuts.${action}`)}
              </span>
              <button
                onClick={() => setRecording(isRecording ? null : action)}
                className={`min-w-[110px] text-xs px-2 py-1 rounded border transition-colors text-right ${
                  isRecording
                    ? 'border-primary text-primary bg-primary/10 animate-pulse'
                    : 'border-border-default text-fg-dim hover:border-fg-dim hover:text-fg-secondary'
                }`}
              >
                {isRecording ? t('shortcuts.pressKey') : getShortcutDisplay(action)}
              </button>
            </div>
          )
        })}
      </div>

      {recording && (
        <p className="text-xs text-fg-dim text-center">
          {t('shortcuts.escToCancel')}
        </p>
      )}
    </div>
  )
}
