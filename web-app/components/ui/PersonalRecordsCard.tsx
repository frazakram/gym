'use client'

import { useEffect, useState } from 'react'
import { Trophy, Dumbbell } from 'lucide-react'
import type { PersonalRecord } from '@/types'
import { csrfFetch } from '@/lib/useCsrf'
import { GlassCard } from './GlassCard'

/**
 * Self-contained card that fetches and displays the user's heaviest logged
 * lifts. Renders nothing until loaded; shows a gentle hint when the user
 * hasn't logged any weights yet.
 */
export function PersonalRecordsCard() {
  const [records, setRecords] = useState<PersonalRecord[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await csrfFetch('/api/personal-records')
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        if (!cancelled) setRecords(Array.isArray(data.records) ? data.records : [])
      } catch {
        if (!cancelled) setRecords([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Don't flash an empty shell while loading.
  if (loading) return null

  const list = records ?? []
  const shown = expanded ? list : list.slice(0, 4)

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-gold" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-white">Personal Records</h2>
          <p className="text-xs text-muted">Your heaviest logged lifts</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-3 text-xs text-slate-200/85 flex items-start gap-2">
          <Dumbbell className="w-3.5 h-3.5 text-primary-light mt-0.5 shrink-0" />
          <span>
            Log the weight you lift on each exercise during a workout and your personal bests will show up here.
          </span>
        </div>
      ) : (
        <>
          <ul className="space-y-1.5">
            {shown.map((r) => (
              <li
                key={r.exercise}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-primary/10 px-3 py-2"
              >
                <span className="text-sm text-white/90 truncate">{r.exercise}</span>
                <span className="text-sm font-semibold text-primary-light tabular-nums shrink-0">
                  {r.weight}
                  <span className="text-xs text-muted font-normal"> kg</span>
                  {r.reps ? <span className="text-xs text-muted font-normal"> × {r.reps}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {list.length > 4 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 w-full text-xs font-medium text-primary-light hover:text-white transition"
            >
              {expanded ? 'Show less' : `Show all ${list.length}`}
            </button>
          )}
        </>
      )}
    </GlassCard>
  )
}
