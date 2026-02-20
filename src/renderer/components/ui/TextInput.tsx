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
      className={`px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                  placeholder:text-neutral-500 focus:outline-none focus:border-primary ${
                    fullWidth ? 'w-full' : ''
                  } ${className}`}
      {...rest}
    />
  )
})

export default TextInput
