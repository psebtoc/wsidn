import { useRef } from 'react'
import { useTerminal } from '@renderer/hooks/useTerminal'
import { useConfigStore } from '@renderer/stores/config-store'
import { getThemePreset } from '@renderer/themes/theme-presets'

interface TerminalPaneProps {
  sessionId: string
  isActive: boolean
}

export default function TerminalPane({ sessionId, isActive }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const themeId = useConfigStore((s) => s.config.theme)
  const terminalColors = useConfigStore((s) => s.config.terminalColors)
  const bg = terminalColors[themeId]?.background ?? getThemePreset(themeId).colors.terminalBg
  useTerminal(sessionId, containerRef, isActive)

  return (
    <div className="w-full h-full p-2" style={{ backgroundColor: bg }}>
      <div ref={containerRef} className="w-full h-full overflow-hidden" />
    </div>
  )
}
