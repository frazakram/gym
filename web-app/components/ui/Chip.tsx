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
        'ui-chip inline-flex items-center gap-2 px-3 py-2 text-xs font-medium',
        'transition-all active:scale-[0.98]',
        'border',
        selected
          ? 'border-emerald-400/35 bg-emerald-400/12 text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.10)]'
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

