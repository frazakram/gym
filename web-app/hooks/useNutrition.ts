'use client'

import { useCallback, useEffect, useState } from 'react'
import { csrfFetch } from '@/lib/useCsrf'
import { toastError, toastSuccess } from '@/lib/toast'
import type {
  NutritionDaySummary,
  NutritionGoals,
  FoodEntry,
  FavoriteFood,
  FoodSearchResult,
  DraftFoodItem,
  PhotoRecognitionResult,
} from '@/types'

const pad = (n: number) => String(n).padStart(2, '0')
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Map a confirmed draft item into the food-entry POST body. */
function draftToBody(item: DraftFoodItem, date: string, favorite?: boolean) {
  return {
    entry_date: date,
    source: item.source,
    name: item.name.trim().slice(0, 200),
    calories: Math.max(0, Math.round(item.calories)),
    protein_g: Math.max(0, item.protein_g),
    carb_g: Math.max(0, item.carb_g),
    fat_g: Math.max(0, item.fat_g),
    quantity: Math.max(0, item.quantity),
    unit: item.unit || 'serving',
    save_favorite: favorite || undefined,
  }
}

/**
 * Central state + actions for the nutrition tracker. Owns the day summary
 * (goals, totals, entries, recent/favorites) and every mutation, so views and
 * modals stay presentational. All requests go through csrfFetch.
 */
export function useNutrition() {
  const [date, setDate] = useState<string>(todayStr())
  const [summary, setSummary] = useState<NutritionDaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)

  const refresh = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const res = await csrfFetch(`/api/nutrition/summary?date=${d}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as NutritionDaySummary
      setSummary(data)
    } catch {
      toastError('Could not load nutrition data', 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh(date)
  }, [date, refresh])

  const goToDate = useCallback((d: string) => setDate(d), [])

  // ---- Logging ----

  /** Log one or more confirmed draft items for the current date. */
  const logItems = useCallback(
    async (items: DraftFoodItem[], opts?: { favorite?: boolean }) => {
      if (items.length === 0) return false
      setMutating(true)
      try {
        const results = await Promise.all(
          items.map((item) =>
            csrfFetch('/api/nutrition/food-entries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(draftToBody(item, date, opts?.favorite)),
            })
          )
        )
        const failed = results.filter((r) => !r.ok).length
        if (failed > 0) toastError(`${failed} item${failed > 1 ? 's' : ''} failed to log`)
        if (failed < items.length) {
          toastSuccess(items.length === 1 ? 'Logged' : `Logged ${items.length - failed} items`)
        }
        await refresh(date)
        return failed === 0
      } catch {
        toastError('Could not log food')
        return false
      } finally {
        setMutating(false)
      }
    },
    [date, refresh]
  )

  /** Quick-log a saved favorite / recent food as-is. */
  const logFavorite = useCallback(
    async (fav: FavoriteFood) => {
      return logItems([
        {
          tempId: `fav-${fav.id}`,
          name: fav.name,
          quantity: fav.quantity,
          unit: fav.unit,
          source: fav.source,
          calories: fav.calories,
          protein_g: fav.protein_g,
          carb_g: fav.carb_g,
          fat_g: fav.fat_g,
        },
      ])
    },
    [logItems]
  )

  const updateEntry = useCallback(
    async (id: number, patch: Partial<Pick<FoodEntry, 'name' | 'calories' | 'protein_g' | 'carb_g' | 'fat_g' | 'quantity' | 'unit'>>) => {
      setMutating(true)
      try {
        const res = await csrfFetch(`/api/nutrition/food-entries/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw new Error('failed')
        await refresh(date)
        return true
      } catch {
        toastError('Could not update entry')
        return false
      } finally {
        setMutating(false)
      }
    },
    [date, refresh]
  )

  const deleteEntry = useCallback(
    async (id: number) => {
      // Optimistic removal for snappy UX.
      setSummary((prev) =>
        prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== id) } : prev
      )
      try {
        const res = await csrfFetch(`/api/nutrition/food-entries/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('failed')
        await refresh(date)
        return true
      } catch {
        toastError('Could not delete entry')
        await refresh(date)
        return false
      }
    },
    [date, refresh]
  )

  const removeFavorite = useCallback(
    async (id: number) => {
      setSummary((prev) =>
        prev ? { ...prev, favorites: prev.favorites.filter((f) => f.id !== id) } : prev
      )
      try {
        const res = await csrfFetch(`/api/nutrition/favorites/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('failed')
        await refresh(date)
      } catch {
        toastError('Could not remove favorite')
        await refresh(date)
      }
    },
    [date, refresh]
  )

  // ---- Goals ----

  const saveGoals = useCallback(
    async (partial: Partial<NutritionGoals>) => {
      setMutating(true)
      try {
        const res = await csrfFetch('/api/nutrition/goals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partial),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'failed')
        }
        toastSuccess('Goals updated')
        await refresh(date)
        return true
      } catch (e) {
        toastError('Could not save goals', e instanceof Error ? e.message : undefined)
        return false
      } finally {
        setMutating(false)
      }
    },
    [date, refresh]
  )

  /** Calculate (and optionally save) TDEE-based targets. */
  const calcGoals = useCallback(
    async (input: {
      age: number
      weight_kg: number
      height_cm: number
      sex: 'Male' | 'Female'
      activity_level: string
      goal_type: string
      save?: boolean
    }): Promise<{ bmr: number; tdee: number; goals: NutritionGoals } | null> => {
      setMutating(true)
      try {
        const res = await csrfFetch('/api/nutrition/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'failed')
        }
        const data = await res.json()
        if (input.save) {
          toastSuccess('Daily targets set')
          await refresh(date)
        }
        return { bmr: data.bmr, tdee: data.tdee, goals: data.goals }
      } catch (e) {
        toastError('Could not calculate targets', e instanceof Error ? e.message : undefined)
        return null
      } finally {
        setMutating(false)
      }
    },
    [date, refresh]
  )

  // ---- Lookups (return data to caller; modals own their own loading state) ----

  const search = useCallback(async (q: string): Promise<FoodSearchResult[]> => {
    if (q.trim().length < 2) return []
    try {
      const res = await csrfFetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) {
        if (res.status === 429) toastError('Slow down', 'Too many searches in a short time.')
        return []
      }
      const data = await res.json()
      return (data.results as FoodSearchResult[]) || []
    } catch {
      return []
    }
  }, [])

  const lookupBarcode = useCallback(
    async (barcode: string): Promise<FoodSearchResult | null> => {
      try {
        const res = await csrfFetch(`/api/nutrition/barcode?barcode=${encodeURIComponent(barcode)}`)
        if (!res.ok) return null
        const data = await res.json()
        return data.found ? (data.result as FoodSearchResult) : null
      } catch {
        return null
      }
    },
    []
  )

  const recognizePhoto = useCallback(
    async (imageDataUrl: string): Promise<PhotoRecognitionResult> => {
      try {
        const res = await csrfFetch('/api/nutrition/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageDataUrl }),
        })
        const data = (await res.json()) as PhotoRecognitionResult
        return data
      } catch {
        return { ok: false, reason: 'error', items: [] }
      }
    },
    []
  )

  const goals = summary?.goals ?? null
  const hasGoals = Boolean(goals?.daily_calorie_goal)

  return {
    date,
    summary,
    goals,
    hasGoals,
    loading,
    mutating,
    refresh: () => refresh(date),
    goToDate,
    logItems,
    logFavorite,
    updateEntry,
    deleteEntry,
    removeFavorite,
    saveGoals,
    calcGoals,
    search,
    lookupBarcode,
    recognizePhoto,
  }
}

export type UseNutrition = ReturnType<typeof useNutrition>
