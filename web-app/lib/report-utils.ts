import { getExerciseMuscleInfo, MuscleGroup, BodyRegion } from './exercise-muscles'
import { WeeklyRoutine } from '@/types'

export interface WeeklyReportData {
  completionPercentage: number
  totalExercises: number
  completedExercises: number
  muscleActivation: Record<MuscleGroup, number>
  regionActivation: Record<BodyRegion, number>
  completedDaysCount: number
  totalDaysCount: number
  weeklyXp: number
  estimatedCalories: number
  primaryFocusRegion: string
}

export function generateWeeklyReportData(
  routine: WeeklyRoutine | null,
  exerciseCompletions: Map<string, boolean> | Record<string, boolean>,
  dayCompletions: Map<number, boolean> | Record<string, boolean> | Record<number, boolean>,
  bodyWeightKg?: number
): WeeklyReportData {
  const defaultData: WeeklyReportData = {
    completionPercentage: 0,
    totalExercises: 0,
    completedExercises: 0,
    muscleActivation: {} as Record<MuscleGroup, number>,
    regionActivation: {} as Record<BodyRegion, number>,
    completedDaysCount: 0,
    totalDaysCount: 0,
    weeklyXp: 0,
    estimatedCalories: 0,
    primaryFocusRegion: 'None',
  }

  if (!routine || !routine.days) return defaultData

  // Normalize completions (could be Map or plain object depending on where it's parsed/fetched)
  const getExerciseCompleted = (dayIdx: number, exIdx: number): boolean => {
    const key = `${dayIdx}-${exIdx}`
    if (exerciseCompletions instanceof Map) {
      return exerciseCompletions.get(key) === true
    }
    return (exerciseCompletions as Record<string, boolean>)?.[key] === true
  }

  const getDayCompleted = (dayIdx: number): boolean => {
    if (dayCompletions instanceof Map) {
      return dayCompletions.get(dayIdx) === true
    }
    // Handle stringified or numeric keys in record objects
    return (dayCompletions as any)?.[dayIdx] === true || (dayCompletions as any)?.[String(dayIdx)] === true
  }

  const muscleCount: Record<string, number> = {}
  const regionCount: Record<string, number> = {}
  let totalItems = 0
  let completedItems = 0
  let completedExercises = 0
  let totalExercises = 0
  let completedDaysCount = 0
  const totalDaysCount = routine.days.length
  let totalMuscleWeight = 0
  let completedStrength = 0
  let completedCardio = 0
  let restDaysCompleted = 0

  routine.days.forEach((day, dayIdx) => {
    const isRestDay = (day.exercises?.length || 0) === 0
    if (isRestDay) {
      totalItems++
      const done = getDayCompleted(dayIdx)
      if (done) {
        completedItems++
        completedDaysCount++
        restDaysCompleted++
      }
      return
    }

    let dayCompleted = true

    day.exercises.forEach((ex, exIdx) => {
      totalItems++
      totalExercises++
      const done = getExerciseCompleted(dayIdx, exIdx)
      if (done) {
        completedItems++
        completedExercises++

        // Track strength vs cardio separately for MET-based calorie calc below
        const isCardio = /run|jog|cycling|bike|hiit|cardio|rowing|rope|jack|burpee/i.test(ex.name)
        if (isCardio) completedCardio++
        else completedStrength++

        // Gather target muscles
        const info = getExerciseMuscleInfo(ex.name)
        if (info) {
          // Primary muscles get 1.0 weight
          info.primary.forEach((m) => {
            muscleCount[m] = (muscleCount[m] || 0) + 1.0
            totalMuscleWeight += 1.0
          })
          // Secondary muscles get 0.5 weight
          info.secondary.forEach((m) => {
            muscleCount[m] = (muscleCount[m] || 0) + 0.5
            totalMuscleWeight += 0.5
          })
          // Region tracking
          if (info.region) {
            regionCount[info.region] = (regionCount[info.region] || 0) + 1
          }
        }
      } else {
        dayCompleted = false
      }
    })

    if (dayCompleted && day.exercises.length > 0) {
      completedDaysCount++
    }
  })

  // Convert muscle counts to relative percentages (work distribution)
  const muscleActivation = {} as Record<MuscleGroup, number>
  const allMuscles: MuscleGroup[] = [
    'chest', 'upper_back', 'lower_back', 'lats', 'shoulders', 'biceps', 'triceps',
    'forearms', 'abs', 'obliques', 'glutes', 'quads', 'hamstrings', 'calves',
    'adductors', 'traps', 'neck', 'cardio',
  ]

  allMuscles.forEach((m) => {
    muscleActivation[m] = totalMuscleWeight > 0
      ? Math.round(((muscleCount[m] || 0) / totalMuscleWeight) * 100)
      : 0
  })

  // Convert region counts to relative percentages
  const regionActivation = {} as Record<BodyRegion, number>
  const allRegions: BodyRegion[] = ['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'full_body', 'cardio']
  const totalRegions = Object.values(regionCount).reduce((a, b) => a + b, 0)

  allRegions.forEach((r) => {
    regionActivation[r] = totalRegions > 0
      ? Math.round(((regionCount[r] || 0) / totalRegions) * 100)
      : 0
  })

  // Find primary focus region
  let primaryFocusRegion = 'Balanced'
  let maxRegionWeight = 0
  Object.entries(regionCount).forEach(([region, weight]) => {
    if (weight > maxRegionWeight) {
      maxRegionWeight = weight
      primaryFocusRegion = region.charAt(0).toUpperCase() + region.slice(1)
    }
  })

  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Calculate XP: 50 XP per completed exercise, 500 XP per completed day (workout or rest day marked done)
  const weeklyXp = (completedExercises * 50) + (completedDaysCount * 500)

  // MET-based calorie estimate — scales with body weight, honest enough to keep
  const estimatedCalories = computeCaloriesBurned(completedStrength, completedCardio, bodyWeightKg)
    + (restDaysCompleted * 30) // light active recovery contribution

  return {
    completionPercentage,
    totalExercises,
    completedExercises,
    muscleActivation,
    regionActivation,
    completedDaysCount,
    totalDaysCount,
    weeklyXp,
    estimatedCalories,
    primaryFocusRegion,
  }
}

// ============================================================
// Deltas & ratios — for week-over-week comparison and imbalance flags
// ============================================================

export interface WeeklyDeltas {
  completionDelta: number          // current% - previous% (in percentage points)
  xpDelta: number                  // current - previous
  completedExercisesDelta: number  // current - previous
  completedDaysDelta: number       // current - previous
}

/** Returns (current - previous) for each headline metric. */
export function computeDeltas(current: WeeklyReportData, previous: WeeklyReportData | null): WeeklyDeltas {
  if (!previous) {
    return {
      completionDelta: 0,
      xpDelta: 0,
      completedExercisesDelta: 0,
      completedDaysDelta: 0,
    }
  }
  return {
    completionDelta: current.completionPercentage - previous.completionPercentage,
    xpDelta: current.weeklyXp - previous.weeklyXp,
    completedExercisesDelta: current.completedExercises - previous.completedExercises,
    completedDaysDelta: current.completedDaysCount - previous.completedDaysCount,
  }
}

export interface PushPullSplit {
  push: number   // % chest + shoulders + triceps
  pull: number   // % back + lats + biceps + traps
  legs: number   // % quads + hamstrings + glutes + calves + adductors
  core: number   // % abs + obliques + lower_back
}

/** Group muscle activation into the four standard movement categories. */
export function computePushPullSplit(muscleActivation: Record<MuscleGroup, number>): PushPullSplit {
  const sum = (keys: MuscleGroup[]) => keys.reduce((acc, k) => acc + (muscleActivation[k] || 0), 0)
  const push = sum(['chest', 'shoulders', 'triceps'])
  const pull = sum(['upper_back', 'lats', 'biceps', 'traps'])
  const legs = sum(['quads', 'hamstrings', 'glutes', 'calves', 'adductors'])
  const core = sum(['abs', 'obliques', 'lower_back'])
  // Normalize to 100 (in case totals don't sum cleanly to 100 due to rounding)
  const total = push + pull + legs + core
  if (total === 0) return { push: 0, pull: 0, legs: 0, core: 0 }
  return {
    push: Math.round((push / total) * 100),
    pull: Math.round((pull / total) * 100),
    legs: Math.round((legs / total) * 100),
    core: Math.round((core / total) * 100),
  }
}

export interface ImbalanceFlag {
  type: 'push_heavy' | 'pull_heavy' | 'legs_neglected' | 'core_neglected' | 'quad_dominant' | 'balanced'
  severity: 'minor' | 'moderate' | 'severe'
  message: string
}

/**
 * Detects imbalances in weekly training. Returns null if balanced.
 * Uses simple ratio thresholds — not gospel, just signal for the user.
 */
export function detectImbalance(
  muscleActivation: Record<MuscleGroup, number>,
  split: PushPullSplit
): ImbalanceFlag | null {
  // Only flag if the user actually trained something this week
  const totalActivation = Object.values(muscleActivation).reduce((a, b) => a + b, 0)
  if (totalActivation < 5) return null

  // Push vs pull imbalance (target: roughly equal, push:pull ~1:1)
  const pushPullDiff = split.push - split.pull
  if (split.pull > 0 && split.push / Math.max(split.pull, 1) >= 2) {
    return {
      type: 'push_heavy',
      severity: pushPullDiff >= 30 ? 'severe' : 'moderate',
      message: `Push-heavy week (${split.push}% push vs ${split.pull}% pull). Add rows, pull-ups, or face-pulls next week to balance shoulders and posture.`,
    }
  }
  if (split.push > 0 && split.pull / Math.max(split.push, 1) >= 2) {
    return {
      type: 'pull_heavy',
      severity: Math.abs(pushPullDiff) >= 30 ? 'severe' : 'moderate',
      message: `Pull-heavy week (${split.pull}% pull vs ${split.push}% push). Mix in some pressing work next week.`,
    }
  }

  // Legs neglected (target: at least 20% of total)
  if (split.legs > 0 && split.legs < 12) {
    return {
      type: 'legs_neglected',
      severity: split.legs < 6 ? 'severe' : 'moderate',
      message: `Lower body got only ${split.legs}% of your work. Consider a dedicated leg day next week.`,
    }
  }
  if (split.legs === 0 && (split.push > 0 || split.pull > 0)) {
    return {
      type: 'legs_neglected',
      severity: 'severe',
      message: `No lower-body work this week. Squats, hinges, or lunges next week will keep your physique balanced.`,
    }
  }

  // Quad-dominant (quads >> hamstrings + glutes)
  const quads = muscleActivation.quads || 0
  const posteriorChain = (muscleActivation.hamstrings || 0) + (muscleActivation.glutes || 0)
  if (quads >= 15 && posteriorChain > 0 && quads / Math.max(posteriorChain, 1) >= 2.5) {
    return {
      type: 'quad_dominant',
      severity: 'moderate',
      message: `Quads (${quads}%) outweighed hamstrings + glutes (${posteriorChain}%) this week. Add Romanian deadlifts or hip thrusts next week.`,
    }
  }

  // Core completely missing
  if (split.core === 0 && totalActivation > 30) {
    return {
      type: 'core_neglected',
      severity: 'minor',
      message: `No direct core work this week. A few sets of planks or hanging knee raises will round out the routine.`,
    }
  }

  return null
}

/**
 * MET-based calorie estimate using session length proxy.
 * Each strength exercise ≈ 4 minutes work + rest, MET ~5.5 for resistance training.
 * Each cardio block ≈ 8 minutes, MET ~7.5.
 * Uses bodyweight (defaults to 70kg if unknown) so the estimate scales.
 *
 * Formula: kcal/min = (MET * 3.5 * weight_kg) / 200
 *
 * Honest enough that we can keep it without misleading the user.
 */
export function computeCaloriesBurned(
  completedStrengthExercises: number,
  completedCardioExercises: number,
  bodyWeightKg: number = 70
): number {
  const w = bodyWeightKg && bodyWeightKg > 30 ? bodyWeightKg : 70
  const strengthMinutes = completedStrengthExercises * 4
  const cardioMinutes = completedCardioExercises * 8
  const strengthKcal = (5.5 * 3.5 * w * strengthMinutes) / 200
  const cardioKcal = (7.5 * 3.5 * w * cardioMinutes) / 200
  return Math.round(strengthKcal + cardioKcal)
}

/**
 * Compute completion % for a single (routine, completions) pair — used by the
 * sparkline to plot the last N weeks without running the full report calc each time.
 */
export function quickCompletionPercent(
  routine: WeeklyRoutine,
  exerciseCompletions: Record<string, boolean>,
  dayCompletions: Record<string, boolean>
): number {
  if (!routine?.days?.length) return 0
  let total = 0
  let done = 0
  routine.days.forEach((day, dIdx) => {
    if (!day.exercises || day.exercises.length === 0) {
      total++
      if (dayCompletions[String(dIdx)] === true) done++
      return
    }
    day.exercises.forEach((_, eIdx) => {
      total++
      if (exerciseCompletions[`${dIdx}-${eIdx}`] === true) done++
    })
  })
  return total > 0 ? Math.round((done / total) * 100) : 0
}

