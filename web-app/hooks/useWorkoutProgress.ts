'use client'

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { csrfFetch } from '@/lib/useCsrf'
import type { WeeklyRoutine } from '@/types'

/** Weight x reps logged for one exercise. */
export type CompletionDetail = { actual_weight?: number | null; actual_reps?: number | null }

/**
 * Workout progress for the current routine: which exercises and days are
 * complete, and the weight x reps logged per exercise (keyed "day-exercise").
 */
export function useWorkoutProgress() {
  const [exerciseCompletions, setExerciseCompletions] = useState<Map<string, boolean>>(new Map())
  const [completionDetails, setCompletionDetails] = useState<Map<string, CompletionDetail>>(new Map())
  const [dayCompletions, setDayCompletions] = useState<Map<number, boolean>>(new Map())

  // Apply a /api/completions response to both the completed map and the
  // logged weight/reps map in one place.
  const applyCompletions = useCallback((completions: any[]) => {
    const map = new Map<string, boolean>()
    const dmap = new Map<string, CompletionDetail>()
    ;(completions || []).forEach((c: any) => {
      const key = `${c.day_index}-${c.exercise_index}`
      map.set(key, c.completed)
      if (c.actual_weight != null || c.actual_reps != null) {
        dmap.set(key, { actual_weight: c.actual_weight ?? null, actual_reps: c.actual_reps ?? null })
      }
    })
    setExerciseCompletions(map)
    setCompletionDetails(dmap)
  }, [])

  return {
    exerciseCompletions, setExerciseCompletions, completionDetails, setCompletionDetails,
    dayCompletions, setDayCompletions, applyCompletions,
  }
}

type ProgressSetters = {
  setExerciseCompletions: Dispatch<SetStateAction<Map<string, boolean>>>
  setCompletionDetails: Dispatch<SetStateAction<Map<string, CompletionDetail>>>
  setDayCompletions: Dispatch<SetStateAction<Map<number, boolean>>>
}

type ProgressContext = {
  routine: WeeklyRoutine | null
  currentRoutineId: number | null
  /** Saves the routine if it has no id yet; returns its id (or null on failure). */
  ensureRoutineSaved: (routine: WeeklyRoutine) => Promise<number | null>
  /** Called after an exercise completion is saved (refreshes heatmap and streak). */
  onProgressSaved: () => void
  onError: (message: string) => void
}

/**
 * Handlers that record progress optimistically and persist it. A separate hook
 * from useWorkoutProgress because the dashboard defines ensureRoutineSaved and
 * the refreshers after the progress state.
 */
export function useWorkoutProgressActions(
  { setExerciseCompletions, setCompletionDetails, setDayCompletions }: ProgressSetters,
  { routine, currentRoutineId, ensureRoutineSaved, onProgressSaved, onError }: ProgressContext,
) {
  const handleToggleExercise = async (
    dayIndex: number,
    exerciseIndex: number,
    completed: boolean,
    details?: { actual_weight?: number | null; actual_reps?: number | null }
  ) => {
    const key = `${dayIndex}-${exerciseIndex}`
    // Optimistic UI update
    setExerciseCompletions(prev => {
      const next = new Map(prev)
      next.set(key, completed)
      return next
    })
    if (details) {
      setCompletionDetails(prev => {
        const next = new Map(prev)
        next.set(key, { actual_weight: details.actual_weight ?? null, actual_reps: details.actual_reps ?? null })
        return next
      })
    }

    // Persist to server
    let rid = currentRoutineId
    if (!rid && routine) {
      rid = await ensureRoutineSaved(routine)
    }
    if (rid) {
      try {
        const res = await csrfFetch('/api/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routineId: rid, dayIndex, exerciseIndex, completed, ...details }),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`API failed: ${res.status} ${text}`)
        }
      } catch (e) {
        console.error('Failed to save completion:', e)
        onError(e instanceof Error ? e.message : String(e));
        // Revert on error
        setExerciseCompletions(prev => {
          const next = new Map(prev)
          next.set(`${dayIndex}-${exerciseIndex}`, !completed)
          return next
        })
        throw e; // Rethrow to let caller know it failed
      }
    } else {
      // Revert if saving the routine failed
      setExerciseCompletions(prev => {
        const next = new Map(prev)
        next.set(`${dayIndex}-${exerciseIndex}`, !completed)
        return next
      })
      throw new Error("Could not save routine context");
    }

    onProgressSaved()
  }

  // Log a weight x reps set. Marks the exercise complete and persists the
  // numbers so they feed the Personal Records card.
  const handleLogSet = async (
    dayIndex: number,
    exerciseIndex: number,
    details: { actual_weight?: number | null; actual_reps?: number | null }
  ) => {
    try {
      await handleToggleExercise(dayIndex, exerciseIndex, true, details)
    } catch (e) {
      console.error('Failed to log set:', e)
    }
  }

  const handleToggleRestDay = async (dayIndex: number, completed: boolean) => {
    let rid = currentRoutineId
    if (!rid && routine) {
      rid = await ensureRoutineSaved(routine)
    }
    if (!rid) return

    // Optimistic update
    setDayCompletions(prev => {
      const next = new Map(prev)
      next.set(dayIndex, completed)
      return next
    })

    try {
      const res = await csrfFetch('/api/day-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId: rid, dayIndex, completed }),
      })
      if (!res.ok) throw new Error('Failed to update')

      setDayCompletions((prev) => {
        const next = new Map(prev)
        next.set(dayIndex, completed)
        return next
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleDayComplete = async (dayIndex: number, completed: boolean) => {
    let rid = currentRoutineId
    if (!rid && routine) {
      rid = await ensureRoutineSaved(routine)
    }
    if (!rid) return
    
    // Optimistic
    setDayCompletions(prev => {
      const next = new Map(prev)
      next.set(dayIndex, completed)
      return next
    })

    try {
      const res = await csrfFetch('/api/day-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId: rid, dayIndex, completed }),
      })
      if (!res.ok) throw new Error('Failed to update day completion')
    } catch (e) {
      console.error(e)
      // Revert
      setDayCompletions(prev => {
        const next = new Map(prev)
        next.set(dayIndex, !completed)
        return next
      })
    }
  }

  return { handleToggleExercise, handleLogSet, handleToggleRestDay, handleToggleDayComplete }
}
