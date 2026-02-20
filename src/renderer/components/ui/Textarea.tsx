import { forwardRef } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  fullWidth?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { fullWidth, className = '', ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                  placeholder:text-neutral-500 focus:outline-none focus:border-primary resize-y ${
                    fullWidth ? 'w-full' : ''
                  } ${className}`}
      {...rest}
    />
  )
})

export default Textarea
