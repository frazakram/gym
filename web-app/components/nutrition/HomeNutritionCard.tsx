'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Apple, ChevronRight, Loader2 } from 'lucide-react'
import { csrfFetch } from '@/lib/useCsrf'
import { GlassCard } from '@/components/ui/GlassCard'
import { MacroProgress } from '@/components/nutrition/MacroProgress'
import { todayStr } from '@/hooks/useNutrition'
import type { NutritionDaySummary } from '@/types'

/**
 * Compact "today's intake" card for the Home tab — shows logged calories/macros
 * vs goal (the tracker, not the meal plan) and a shortcut into the Nutrition tab.
 */
export function HomeNutritionCard({ onOpen }: { onOpen?: () => void }) {
  const [summary, setSummary] = useState<NutritionDaySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    csrfFetch(`/api/nutrition/summary?date=${todayStr()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setSummary(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const hasGoals = Boolean(summary?.goals?.daily_calorie_goal)
  const loggedCount = summary?.entries?.length ?? 0
  const totals = summary?.totals ?? { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center">
            <Apple className="w-4 h-4 text-primary-light" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white font-display leading-tight">Today&apos;s intake</p>
            <p className="text-[11px] text-muted leading-tight">
              {loading ? 'Loading…' : hasGoals ? `${loggedCount} item${loggedCount !== 1 ? 's' : ''} logged` : 'Track what you eat'}
            </p>
          </div>
        </div>
        <button onClick={onOpen} className="flex items-center gap-0.5 text-xs text-primary-light hover:text-primary">
          Open <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : hasGoals ? (
        <>
          <MacroProgress totals={totals} goals={summary?.goals ?? null} />
          <button
            onClick={onOpen}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-accent-ink bg-gradient-to-r from-primary to-primary-light active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" /> Log food
          </button>
        </>
      ) : (
        <button
          onClick={onOpen}
          className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/8 border border-primary/20 text-left active:scale-[0.99] transition-transform"
        >
          <span className="text-sm text-white/85">Set daily calorie &amp; macro goals to start tracking.</span>
          <motion.span className="shrink-0 text-primary-light"><ChevronRight className="w-5 h-5" /></motion.span>
        </button>
      )}
    </GlassCard>
  )
}
