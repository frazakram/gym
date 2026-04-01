'use client'

import { useState, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'ghost' | 'premium' | 'coral'
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
    primary: 'bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] text-white shadow-lg hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:brightness-110',
    secondary: 'bg-white/5 border border-[#8B5CF6]/20 text-slate-100 hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]',
    ghost: 'glass-soft text-slate-100 hover:text-white hover:bg-[#8B5CF6]/10',
    premium: 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-slate-900 font-bold shadow-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:brightness-110',
    coral: 'bg-gradient-to-r from-[#FF6F61] to-[#FF8A65] text-white shadow-lg hover:shadow-[0_0_30px_rgba(255,111,97,0.4)] hover:brightness-110',
  }

  const rippleColors: Record<string, string> = {
    primary: 'bg-white/20',
    secondary: 'bg-[#8B5CF6]/20',
    ghost: 'bg-white/15',
    premium: 'bg-white/30',
    coral: 'bg-white/25',
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  }

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      className={`
        relative overflow-hidden rounded-xl font-semibold
        transition-all disabled:opacity-50 disabled:cursor-not-allowed
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
          className={`absolute ${rippleColors[variant] || 'bg-white/20'} rounded-full animate-ripple pointer-events-none`}
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
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : icon ? (
          <>
            {icon}
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </span>
    </motion.button>
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
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={{ scale: 0.9 }}
      className={`
        p-2 rounded-full glass-soft text-slate-300 hover:text-white hover:bg-[#8B5CF6]/10
        transition-all ui-focus-ring ${className}
      `}
    >
      {children}
    </motion.button>
  )
}
