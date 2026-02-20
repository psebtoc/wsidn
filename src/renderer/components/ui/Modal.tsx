import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  width?: string
  portal?: boolean
  className?: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, width = 'w-[480px]', portal, className = '', children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const content = (
    <div
      className={`fixed inset-0 bg-black/60 flex items-center justify-center ${portal ? 'z-[9999]' : 'z-50'}`}
      onClick={onClose}
    >
      <div
        className={`bg-elevated rounded-lg border border-border-default p-6 shadow-xl max-h-[80vh] overflow-y-auto ${width} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )

  if (portal) return createPortal(content, document.body)
  return content
}
