'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, ChevronRight, CalendarDays } from 'lucide-react'
import { csrfFetch } from '@/lib/useCsrf'
import { SheetModal } from './SheetModal'
import { todayStr } from '@/hooks/useNutrition'
import type { FoodEntry, NutritionGoals } from '@/types'

interface NutritionHistoryProps {
  open: boolean
  onClose: () => void
  goals: NutritionGoals | null
  /** Jump the main view to a chosen day. */
  onPickDay: (date: string) => void
}

function daysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function prettyDate(iso: string): string {
  const today = todayStr()
  const yest = daysAgoStr(1)
  if (iso === today) return 'Today'
  if (iso === yest) return 'Yesterday'
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function NutritionHistory({ open, onClose, goals, onPickDay }: NutritionHistoryProps) {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    csrfFetch(`/api/nutrition/food-entries?from=${daysAgoStr(29)}&to=${todayStr()}`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [open])

  const insights = useMemo(() => {
    const cutoff = daysAgoStr(6) // today + previous 6 = last 7 days
    const byDay = new Map<string, { cal: number; pro: number }>()
    for (const e of entries) {
      if (e.entry_date < cutoff) continue
      const c = byDay.get(e.entry_date) ?? { cal: 0, pro: 0 }
      c.cal += e.calories
      c.pro += e.protein_g
      byDay.set(e.entry_date, c)
    }
    const loggedDays = byDay.size
    const vals = Array.from(byDay.values())
    const avgCal = loggedDays ? Math.round(vals.reduce((s, v) => s + v.cal, 0) / loggedDays) : 0
    const avgPro = loggedDays ? Math.round(vals.reduce((s, v) => s + v.pro, 0) / loggedDays) : 0
    return { loggedDays, avgCal, avgPro }
  }, [entries])

  const days = useMemo(() => {
    const map = new Map<string, { calories: number; count: number }>()
    for (const e of entries) {
      const cur = map.get(e.entry_date) ?? { calories: 0, count: 0 }
      cur.calories += e.calories
      cur.count += 1
      map.set(e.entry_date, cur)
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, v]) => ({ date, calories: Math.round(v.calories), count: v.count }))
  }, [entries])

  const goal = goals?.daily_calorie_goal ?? null

  return (
    <SheetModal open={open} onClose={onClose} title="History" subtitle="Last 30 days">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <CalendarDays className="w-8 h-8 text-muted mb-2" />
          <p className="text-sm text-muted">No logged days yet. Start logging to build your history.</p>
        </div>
      ) : (
        <>
          {/* Last-7-day insights */}
          {insights.loggedDays > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Insight label="Days logged" value={`${insights.loggedDays}/7`} />
              <Insight label="Avg calories" value={`${insights.avgCal}`} sub={goal ? `/ ${goal}` : 'kcal'} />
              <Insight label="Avg protein" value={`${insights.avgPro}`} sub="g/day" />
            </div>
          )}
          <ul className="space-y-2">
          {days.map((d) => {
            const pct = goal && goal > 0 ? Math.min(1, d.calories / goal) : 0
            const over = goal != null && d.calories > goal
            return (
              <li key={d.date}>
                <button
                  onClick={() => { onPickDay(d.date); onClose() }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/4 border border-white/8 hover:border-primary/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-white">{prettyDate(d.date)}</span>
                      <span className="text-xs text-muted">
                        {d.calories}{goal != null ? ` / ${goal}` : ''} kcal · {d.count} item{d.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct * 100}%`, background: over ? '#FF6F61' : '#00B294' }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                </button>
              </li>
            )
          })}
          </ul>
        </>
      )}
    </SheetModal>
  )
}

function Insight({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/8 px-2 py-2.5 text-center">
      <p className="text-base font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
      <p className="text-[10px] text-muted mt-1">{label}</p>
    </div>
  )
}
