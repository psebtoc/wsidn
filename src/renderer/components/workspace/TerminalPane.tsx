import { useRef } from 'react'
import { useTerminal } from '@renderer/hooks/useTerminal'
import { useConfigStore } from '@renderer/stores/config-store'

interface TerminalPaneProps {
  sessionId: string
}

export default function TerminalPane({ sessionId }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bg = useConfigStore((s) => s.config.terminal.background)
  useTerminal(sessionId, containerRef)

  return (
    <div className="w-full h-full p-2" style={{ backgroundColor: bg }}>
      <div ref={containerRef} className="w-full h-full overflow-hidden" />
    </div>
  )
}
