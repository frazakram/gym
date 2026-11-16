'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

export interface HeroPill {
  icon?: ReactNode
  label: string
}

/**
 * Navy page header shared by every dashboard screen except Home (which has
 * its own larger hero). Full-bleed: render it outside any padded container.
 */
export function PageHero({
  title,
  subtitle,
  pills = [],
  right,
  onBack,
  leading,
  progress,
  children,
}: {
  title: string
  subtitle?: ReactNode
  pills?: HeroPill[]
  /** A gb-hero-btn / gb-hero-action element, top right. */
  right?: ReactNode
  onBack?: () => void
  /** Shown before the title (e.g. an avatar). */
  leading?: ReactNode
  /** 0-100: shows a progress bar under the title. */
  progress?: number
  /** Extra hero content under the pills (e.g. a date switcher). */
  children?: ReactNode
}) {
  return (
    <div className="gb-hero gb-page-hero">
      <span className="gb-blob" aria-hidden="true" style={{ '--i': 0, right: -70, top: -80, width: 190, height: 190 } as CSSProperties} />
      <span className="gb-blob" aria-hidden="true" style={{ '--i': 1, right: 64, bottom: -34, width: 56, height: 56 } as CSSProperties} />
      <div className="gb-hero-inner gb-gutter">
        <div className="gb-page-title-row gb-rise">
          {onBack && (
            <button type="button" className="gb-hero-btn gb-press" onClick={onBack} aria-label="Go back">
              <ChevronLeft aria-hidden="true" />
            </button>
          )}
          {leading}
          <div className="gb-page-title-text">
            <h1 className="gb-page-title">{title}</h1>
            {subtitle ? <p className="gb-page-sub">{subtitle}</p> : null}
          </div>
          {right}
        </div>
        {progress !== undefined && (
          <div className="gb-hero-progress gb-rise" style={{ '--i': 1 } as CSSProperties} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label={`${title} progress`}>
            <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        )}
        {pills.length > 0 && (
          <div className="gb-hero-pills gb-rise" style={{ '--i': 1 } as CSSProperties}>
            {pills.map((pill) => (
              <span key={pill.label} className="gb-hero-pill gb-num">{pill.icon}<span>{pill.label}</span></span>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
