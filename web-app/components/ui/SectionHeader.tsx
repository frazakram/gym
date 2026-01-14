'use client'

import type { ReactNode } from 'react'

export function SectionHeader({
  title,
  subtitle,
  right,
  className = '',
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-white truncate">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-300/70 leading-snug">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

