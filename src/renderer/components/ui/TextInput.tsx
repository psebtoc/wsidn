import { forwardRef } from 'react'

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { fullWidth, className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`px-3 py-2 bg-surface border border-border-input rounded text-fg text-sm
                  placeholder:text-fg-dim focus:outline-none focus:border-primary ${
                    fullWidth ? 'w-full' : ''
                  } ${className}`}
      {...rest}
    />
  )
})

export default TextInput
