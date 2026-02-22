interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const SIZES = {
  sm: {
    track: 'w-6 h-3.5',
    thumb: 'w-2.5 h-2.5 top-0.5 left-0.5',
    on: 'translate-x-2.5',
    off: 'translate-x-0',
  },
  md: {
    track: 'w-8 h-[18px]',
    thumb: 'w-3.5 h-3.5 top-0.5 left-0.5',
    on: 'translate-x-3.5',
    off: 'translate-x-0',
  },
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}: ToggleProps) {
  const s = SIZES[size]

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors
                  ${s.track}
                  ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                  ${checked ? 'bg-primary' : 'bg-fg-dimmer'}
                  ${className}`}
    >
      <span
        className={`absolute rounded-full bg-white shadow-sm transition-transform
                    ${s.thumb} ${checked ? s.on : s.off}`}
      />
    </button>
  )
}
