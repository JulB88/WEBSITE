import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  fullWidth?: boolean
}

// Square corners, Montserrat uppercase — matches dsfltee.com button style
const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-primary-500 text-white hover:bg-[#333333] focus:ring-primary-500 border-transparent',
  secondary: 'bg-white text-navy border border-gray-300 hover:bg-gray-50 focus:ring-primary-500',
  danger:    'bg-primary-500 text-white hover:bg-[#333333] focus:ring-primary-500 border-transparent',
  ghost:     'bg-transparent text-navy hover:bg-gray-100 focus:ring-gray-400 border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-2.5 text-xs',
  lg: 'px-8 py-4 text-sm',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, fullWidth = false, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-wider border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-none',
            variantClasses[variant],
            sizeClasses[size],
            fullWidth && 'w-full',
            className
          )
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
