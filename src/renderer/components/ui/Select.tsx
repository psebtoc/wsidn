import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  className?: string
  placeholder?: string
  size?: 'sm' | 'md'
}

const TRIGGER_STYLES = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-3 py-2 text-sm',
}

const ITEM_STYLES = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
}

export default function Select({
  options,
  value,
  onChange,
  fullWidth = false,
  className = '',
  placeholder,
  size = 'md',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 2, left: rect.left, width: rect.width })
  }, [])

  const handleOpen = useCallback(() => {
    updatePosition()
    setOpen(true)
    const idx = options.findIndex((o) => o.value === value)
    setFocusedIndex(idx >= 0 ? idx : 0)
  }, [updatePosition, options, value])

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val)
      setOpen(false)
      triggerRef.current?.focus()
    },
    [onChange]
  )

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      )
        return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          handleOpen()
        }
        return
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((i) => Math.min(i + 1, options.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0) handleSelect(options[focusedIndex].value)
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          break
      }
    },
    [open, focusedIndex, options, handleOpen, handleSelect]
  )

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusedIndex < 0 || !listRef.current) return
    const items = listRef.current.children
    if (items[focusedIndex]) {
      ;(items[focusedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' })
    }
  }, [open, focusedIndex])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        onKeyDown={handleKeyDown}
        className={`flex items-center justify-between gap-1 bg-surface border border-border-input rounded
                    text-fg focus:outline-none focus:border-primary transition-colors cursor-pointer
                    ${TRIGGER_STYLES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        <span className={selectedOption ? 'truncate' : 'text-fg-dim truncate'}>
          {selectedOption?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown
          size={size === 'sm' ? 10 : 14}
          className={`flex-shrink-0 text-fg-dim transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={listRef}
            className="fixed z-[9999] bg-elevated border border-border-default rounded shadow-lg
                       py-1 max-h-48 overflow-y-auto"
            style={{ top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 80) }}
          >
            {options.map((opt, idx) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`${ITEM_STYLES[size]} cursor-pointer transition-colors
                  ${idx === focusedIndex ? 'bg-hover text-fg' : 'text-fg-secondary'}
                  ${opt.value === value ? 'text-primary font-medium' : ''}`}
              >
                {opt.label}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
