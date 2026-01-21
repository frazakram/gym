'use client'

import { useState, ReactNode } from 'react'

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
  icon?: ReactNode
  fullWidth?: boolean
}

export function AnimatedButton({
  children,
  onClick,
  type,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  icon,
  fullWidth = false
}: AnimatedButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    setRipples(prev => [...prev, { x, y, id }])
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id))
    }, 600)

    onClick?.()
  }

  const variantClasses = {
    primary: 'btn-primary text-white hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]',
    secondary: 'btn-secondary hover:shadow-[0_0_20px_rgba(96,165,250,0.25)]',
    ghost: 'glass-soft text-slate-100 hover:text-white hover:bg-white/10'
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden rounded-xl font-semibold
        transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ui-focus-ring ${className}
      `}
    >
      {/* Ripple effect */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ripple pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
          }}
        />
      ))}

      {/* Content */}
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : icon ? (
          <>
            {icon}
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  )
}

// Icon Buttons
export function IconButton({
  children,
  onClick,
  className = '',
  ariaLabel
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  ariaLabel: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`
        p-2 rounded-full glass-soft text-slate-300 hover:text-white hover:bg-white/10
        transition-all active:scale-90 ui-focus-ring ${className}
      `}
    >
      {children}
    </button>
  )
}
