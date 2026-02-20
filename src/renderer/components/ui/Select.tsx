import { forwardRef } from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  fullWidth?: boolean
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { fullWidth, className = '', children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={`px-3 py-2 bg-surface border border-border-input rounded text-fg text-sm
                  focus:outline-none focus:border-primary ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
})

export default Select
