import { useRef } from 'react'
import { useTerminal } from '@renderer/hooks/useTerminal'

interface TerminalPaneProps {
  sessionId: string
}

export default function TerminalPane({ sessionId }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useTerminal(sessionId, containerRef)

  return (
    <div className="w-full h-full bg-[#1a1a1a] p-2">
      <div ref={containerRef} className="w-full h-full overflow-hidden" />
    </div>
  )
}
