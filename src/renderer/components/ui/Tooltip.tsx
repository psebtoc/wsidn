import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactElement
}

export default function Tooltip({ content, side = 'bottom', children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const gap = 6

      let top: number, left: number
      switch (side) {
        case 'top':
          top = rect.top - gap
          left = rect.left + rect.width / 2
          break
        case 'bottom':
          top = rect.bottom + gap
          left = rect.left + rect.width / 2
          break
        case 'left':
          top = rect.top + rect.height / 2
          left = rect.left - gap
          break
        case 'right':
          top = rect.top + rect.height / 2
          left = rect.right + gap
          break
      }

      setPos({ top, left })
      setVisible(true)
    }, 400)
  }, [side])

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const transformOrigin = {
    top: 'translateX(-50%) translateY(-100%)',
    bottom: 'translateX(-50%)',
    left: 'translateY(-50%) translateX(-100%)',
    right: 'translateY(-50%)',
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="inline-flex"
      >
        {children}
      </div>
      {visible &&
        createPortal(
          <div
            className="fixed z-[9999] px-2 py-1 text-xs text-fg bg-elevated border border-border-default
                       rounded shadow-lg pointer-events-none whitespace-nowrap"
            style={{
              top: pos.top,
              left: pos.left,
              transform: transformOrigin[side],
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  )
}
