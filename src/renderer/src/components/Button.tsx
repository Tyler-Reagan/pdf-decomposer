import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed select-none'

    const variants = {
      primary: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm',
      secondary:
        'bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 border border-slate-600',
      ghost: 'hover:bg-slate-700/60 active:bg-slate-700 text-slate-300 hover:text-white',
      danger: 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-sm'
    }

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-3 gap-2.5'
    }

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
