'use client'

import type { MouseEvent } from 'react'
import { Moon, Sun } from 'lucide-react'
import { setThemeChoice, useTheme } from '@/hooks/useTheme'
import { DARK_MODE_AVAILABLE, toggledChoice } from '@/lib/theme'

/** Sun/moon button. `onHero` styles it for the navy header; otherwise for a white card. */
export function ThemeToggle({ onHero = false }: { onHero?: boolean }) {
  const { theme } = useTheme()
  if (!DARK_MODE_AVAILABLE) return null
  const isDark = theme === 'dark'
  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setThemeChoice(toggledChoice(theme), { x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={`${onHero ? 'gb-hero-btn' : 'gb-theme-btn'} gb-press`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  )
}
