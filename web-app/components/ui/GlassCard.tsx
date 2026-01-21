'use client'

import type { ReactNode } from 'react'

type GlassVariant = 'default' | 'soft' | 'menu' | 'solid' | 'premium'

const variantClass: Record<GlassVariant, string> = {
  default: 'glass',
  soft: 'glass-soft',
  menu: 'glass-menu',
  solid: 'panel-solid',
  premium: 'glass border-[#F59E0B]/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
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
        hover:shadow-xl hover:shadow-black/15 hover:-translate-y-0.5
        ${glowOnHover ? 'gradient-border-hover' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  )
}


