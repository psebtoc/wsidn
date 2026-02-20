interface CheckboxProps {
  state: 'unchecked' | 'indeterminate' | 'checked'
  onChange: () => void
  className?: string
}

export default function Checkbox({ state, onChange, className = '' }: CheckboxProps) {
  return (
    <button
      onClick={onChange}
      className={`w-3.5 h-3.5 flex-shrink-0 rounded-sm border flex items-center justify-center
                  transition-colors ${
                    state === 'checked'
                      ? 'bg-primary border-primary'
                      : 'border-fg-dim hover:border-fg-secondary'
                  } ${className}`}
    >
      {state === 'checked' && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {state === 'indeterminate' && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary/80" />
      )}
    </button>
  )
}
