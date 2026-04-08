'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function Chip({
  selected,
  onClick,
  children,
  icon,
  className = '',
  ariaLabel,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  icon?: ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      animate={selected ? { scale: 1 } : { scale: 1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={[
        'ui-chip inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl',
        'transition-all',
        'border',
        selected
          ? 'border-primary/40 bg-primary/15 text-primary-lighter shadow-[0_0_15px_rgba(139,92,246,0.15)]'
          : 'border-primary/10 bg-white/5 text-slate-300 hover:bg-primary/8 hover:text-slate-100',
        'ui-focus-ring',
        className,
      ].join(' ')}
    >
      {icon ? <span className="text-[13px]">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </motion.button>
  )
}
