interface RadioProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  className?: string
}

export default function Radio({ checked, onChange, disabled = false, className = '' }: RadioProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center
                  transition-colors ${
                    checked
                      ? 'border-primary'
                      : disabled
                        ? 'border-fg-dimmer'
                        : 'border-fg-dim hover:border-fg-secondary'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
    >
      {checked && <div className="w-2 h-2 rounded-full bg-primary" />}
    </button>
  )
}
