'use client'

import type { ReactNode } from 'react'

type GlassVariant = 'default' | 'soft' | 'menu' | 'solid' | 'premium'

const variantClass: Record<GlassVariant, string> = {
  default: 'glass border-primary/10',
  soft: 'glass-soft border-primary/5',
  menu: 'glass-menu border-primary/10',
  solid: 'panel-solid border-primary/15',
  premium: 'glass border-gold/40 shadow-[0_0_20px_rgba(245,158,11,0.15),0_0_40px_rgba(245,158,11,0.05)]',
}

export function GlassCard({
  children,
  className = '',
  variant = 'default',
  as: Component = 'div',
  glowOnHover = true,
}: {
  children: ReactNode
  className?: string
  variant?: GlassVariant
  as?: 'div' | 'section' | 'article'
  glowOnHover?: boolean
}) {
  return (
    <Component
      className={`
        ${variantClass[variant]} ui-card rounded-2xl
        transition-all duration-300
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5
        ${glowOnHover ? 'hover:border-primary/25 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  )
}
