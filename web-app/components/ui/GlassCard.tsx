'use client'

import type { ReactNode } from 'react'

type GlassVariant = 'default' | 'soft' | 'menu' | 'solid' | 'premium'

const variantClass: Record<GlassVariant, string> = {
  default: 'glass border-[#8B5CF6]/10',
  soft: 'glass-soft border-[#8B5CF6]/5',
  menu: 'glass-menu border-[#8B5CF6]/10',
  solid: 'panel-solid border-[#8B5CF6]/15',
  premium: 'glass border-[#F59E0B]/40 shadow-[0_0_20px_rgba(245,158,11,0.15),0_0_40px_rgba(245,158,11,0.05)]',
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
        hover:shadow-xl hover:shadow-[#8B5CF6]/10 hover:-translate-y-0.5
        ${glowOnHover ? 'hover:border-[#8B5CF6]/25 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  )
}
