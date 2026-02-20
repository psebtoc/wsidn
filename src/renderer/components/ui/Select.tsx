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
      className={`px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-white text-sm
                  focus:outline-none focus:border-primary ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
})

export default Select
