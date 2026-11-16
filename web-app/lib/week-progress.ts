import type { WeeklyRoutine } from '@/types'

/**
 * Week progress for the Home/Today screen and the weekly breakdown sheet,
 * derived from data the dashboard already has (no extra fetch).
 * Kept out of the view so the maths is unit-tested on its own.
 */

export interface WeekProgress {
  completed: number
  total: number
  percentage: number
}

export interface DayBreakdown {
  label: string      // 'Mon', 'Tue', etc.
  fullName: string   // Full day name from routine, e.g. "Monday - Push (Chest, Shoulders, Triceps)"
  completed: number
  total: number
  isRestDay: boolean
}

type Completions = Map<string, boolean>
type DayCompletions = Map<number, boolean>

const SHORT_DAY: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}
const MAX_DAY_NAME = 42

const isRest = (day: WeeklyRoutine['days'][number]) => (day.exercises?.length || 0) === 0

/** Each exercise counts as one item; a rest day counts as one item (marked done). */
export function calculateWeekProgress(routine: WeeklyRoutine | null, exerciseCompletions: Completions, dayCompletions: DayCompletions): WeekProgress {
  if (!routine) return { completed: 0, total: 0, percentage: 0 }
  let total = 0
  let completed = 0
  routine.days.forEach((day, dIdx) => {
    if (isRest(day)) {
      total++
      if (dayCompletions.get(dIdx)) completed++
      return
    }
    day.exercises.forEach((_, eIdx) => {
      total++
      if (exerciseCompletions.get(`${dIdx}-${eIdx}`)) completed++
    })
  })
  return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
}

export function buildDayBreakdowns(routine: WeeklyRoutine | null, exerciseCompletions: Completions, dayCompletions: DayCompletions): DayBreakdown[] {
  if (!routine) return []
  return routine.days.map((day, dIdx) => {
    const firstWord = day.day.split(/[\s\-\u2013]/)[0].toLowerCase()
    const label = SHORT_DAY[firstWord] ?? day.day.slice(0, 3)
    const fullName = day.day.length > MAX_DAY_NAME ? day.day.slice(0, 40) + '\u2026' : day.day
    if (isRest(day)) {
      return { label, fullName, completed: dayCompletions.get(dIdx) === true ? 1 : 0, total: 1, isRestDay: true }
    }
    const completed = day.exercises.filter((_, eIdx) => exerciseCompletions.get(`${dIdx}-${eIdx}`)).length
    return { label, fullName, completed, total: day.exercises.length, isRestDay: false }
  })
}

/** Monday = 0 ... Sunday = 6, capped at the routine's last day. */
export function todaysRoutineIndex(now: Date, dayCount: number): number {
  return Math.min((now.getDay() + 6) % 7, Math.max(dayCount, 1) - 1)
}

/** The estimate the dashboard has always shown: 8 minutes per exercise plus a 12-minute warm-up. */
export function estimatedWorkoutMinutes(exerciseCount: number): number {
  return exerciseCount * 8 + 12
}

const WEEKDAY_PREFIX = /^(mon|tues|wednes|thurs|fri|satur|sun)day\s*[-\u2013\u2014:]\s*/i

/** "Monday - Push (Chest)" -> "Push (Chest)"; names without a weekday prefix are returned unchanged. */
export function workoutTitle(dayName: string): string {
  const title = dayName.replace(WEEKDAY_PREFIX, '').trim()
  return title || dayName
}
