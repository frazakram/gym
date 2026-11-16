'use client'

import { useEffect, useState } from 'react'
import { csrfFetch } from '@/lib/useCsrf'
import { todayStr } from '@/hooks/useNutrition'
import type { NutritionDaySummary } from '@/types'

/** Today's logged food (totals vs goals) for the Home screen; null when it could not load. */
export function useTodayNutrition() {
  const [summary, setSummary] = useState<NutritionDaySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    csrfFetch(`/api/nutrition/summary?date=${todayStr()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NutritionDaySummary | null) => { if (alive) setSummary(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return { summary, loading }
}
