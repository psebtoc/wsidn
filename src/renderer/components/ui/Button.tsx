import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md'
  loading?: boolean
  fullWidth?: boolean
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary hover:bg-primary-hover disabled:bg-hover disabled:text-fg-muted text-fg font-medium',
  secondary: 'bg-secondary hover:bg-secondary-hover text-fg',
  ghost: 'text-fg-muted hover:text-fg',
  danger: 'bg-red-600 hover:bg-red-500 text-white font-medium',
}

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'px-3 py-1.5 text-xs rounded',
  sm: 'px-3 py-2 text-sm rounded',
  md: 'px-4 py-2 text-sm rounded',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className = '', children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`transition-colors ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {loading ? '...' : children}
    </button>
  )
})

export default Button
