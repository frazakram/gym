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
          ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-[#C4B5FD] shadow-[0_0_15px_rgba(139,92,246,0.15)]'
          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8 hover:text-slate-100',
        'ui-focus-ring',
        className,
      ].join(' ')}
    >
      {icon ? <span className="text-[13px]">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </motion.button>
  )
}
