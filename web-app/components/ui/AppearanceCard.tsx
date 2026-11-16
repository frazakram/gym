'use client'

import type { ComponentType, MouseEvent } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { SectionHeader } from './SectionHeader'
import { setThemeChoice, useTheme } from '@/hooks/useTheme'
import { DARK_MODE_AVAILABLE, type ThemeChoice } from '@/lib/theme'

const OPTIONS: { choice: ThemeChoice; label: string; icon: ComponentType<{ 'aria-hidden'?: boolean }> }[] = [
  { choice: 'light', label: 'Light', icon: Sun },
  { choice: 'dark', label: 'Dark', icon: Moon },
  { choice: 'system', label: 'System', icon: Monitor },
]

/** Profile setting: Light, Dark, or follow the phone (System). */
export function AppearanceCard() {
  const { choice } = useTheme()
  if (!DARK_MODE_AVAILABLE) return null
  const pick = (next: ThemeChoice) => (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setThemeChoice(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }
  return (
    <GlassCard className="p-4">
      <SectionHeader title="Appearance" subtitle="System follows your phone's setting" />
      <div className="gb-seg mt-3" role="group" aria-label="Theme">
        {OPTIONS.map(({ choice: option, label, icon: Icon }) => (
          <button key={option} type="button" aria-pressed={choice === option} onClick={pick(option)} className="gb-press">
            <Icon aria-hidden />{label}
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
