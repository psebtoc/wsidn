import { forwardRef } from 'react'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  hoverColor?: 'default' | 'danger' | 'warning' | 'success'
  showOnGroupHover?: boolean
  active?: boolean
}

const SIZE_STYLES: Record<NonNullable<IconButtonProps['size']>, string> = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
}

const HOVER_STYLES: Record<NonNullable<IconButtonProps['hoverColor']>, string> = {
  default: 'text-neutral-500 hover:text-neutral-300',
  danger: 'text-neutral-500 hover:text-red-400',
  warning: 'text-neutral-500 hover:text-yellow-400',
  success: 'text-neutral-500 hover:text-green-400',
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 'md', hoverColor = 'default', showOnGroupHover, active, className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`flex items-center justify-center rounded transition-colors ${SIZE_STYLES[size]} ${
        active ? 'text-white bg-neutral-700' : HOVER_STYLES[hoverColor]
      } ${showOnGroupHover ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})

export default IconButton
