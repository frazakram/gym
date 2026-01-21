'use client'

import type { ReactNode } from 'react'

type GlassVariant = 'default' | 'soft' | 'menu' | 'solid'

const variantClass: Record<GlassVariant, string> = {
  default: 'glass',
  soft: 'glass-soft',
  menu: 'glass-menu',
  solid: 'panel-solid',
}

export function GlassCard({
  children,
  className = '',
  variant = 'default',
  as: Component = 'div',
}: {
  children: ReactNode
  className?: string
  variant?: GlassVariant
  as?: 'div' | 'section' | 'article'
}) {
  return (
    <Component
      className={`
        ${variantClass[variant]} ui-card rounded-2xl 
        transition-all duration-200 
        hover:shadow-xl hover:shadow-black/15 hover:-translate-y-0.5
        ${className}
      `}
    >
      {children}
    </Component>
  )
}

