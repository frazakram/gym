'use client'

import type { ReactNode } from 'react'

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
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={[
        'ui-chip inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl',
        'transition-all active:scale-[0.98]',
        'border',
        selected
          ? 'border-[#FF6F61]/40 bg-[#FF6F61]/15 text-[#FFCCC7] shadow-[0_0_15px_rgba(255,111,97,0.15)]'
          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8 hover:text-slate-100',
        'ui-focus-ring',
        className,
      ].join(' ')}
    >
      {icon ? <span className="text-[13px]">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  )
}

