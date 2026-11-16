'use client'

import { useId, type ComponentType, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export interface MenuItem {
  label: string
  detail?: string
  icon: ComponentType<{ 'aria-hidden'?: boolean }>
  tint: 'pink' | 'peach' | 'lav' | 'mint'
  onClick?: () => void
}

/** A card of tappable rows with tinted icon tiles (Navy and Pink menu list). */
export function MenuList({ items, label, footer }: { items: MenuItem[]; label?: string; footer?: ReactNode }) {
  const id = useId()
  return (
    <ul className="gb-menu-list" aria-label={label}>
      {items.map(({ label: text, detail, icon: Icon, tint, onClick }, i) => (
        <li key={text}>
          {/* Named by the label alone; the detail line is read as its description. */}
          <button type="button" onClick={onClick} className="gb-press" aria-labelledby={`${id}-l${i}`} aria-describedby={detail ? `${id}-d${i}` : undefined}>
            <span className={`gb-chip gb-tint-${tint}`} aria-hidden="true"><Icon aria-hidden /></span>
            <span className="gb-grow"><span id={`${id}-l${i}`}>{text}</span>{detail ? <small id={`${id}-d${i}`}>{detail}</small> : null}</span>
            <ChevronRight className="gb-row-chev" aria-hidden="true" />
          </button>
        </li>
      ))}
      {footer}
    </ul>
  )
}
