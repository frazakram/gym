/**
 * Training minutes for the Progress screen (Week/Month chart).
 *
 * Minutes are estimated from completed exercises, 8 minutes each: the same
 * per-exercise estimate the plan uses (lib/week-progress.ts). Dates are UTC
 * calendar days, like the heatmap.
 */

export type ProgressRange = 'week' | 'month'
export type ExerciseKind = 'strength' | 'cardio'

export interface CompletedExercise {
  /** YYYY-MM-DD (UTC) */
  date: string
  name: string
}

export interface ProgressBucket {
  label: string
  /** First day of the bucket, YYYY-MM-DD */
  start: string
  strength_min: number
  cardio_min: number
}

export interface ProgressPayload {
  range: ProgressRange
  /** Daily goal for week, weekly goal for month */
  goal_minutes: number
  buckets: ProgressBucket[]
  totals: { strength_min: number; cardio_min: number; active_days: number }
}

export const MINUTES_PER_EXERCISE = 8
const DAILY_GOAL_MINUTES = 30
const WEEKLY_GOAL_MINUTES = 210
const DAY_MS = 86_400_000
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CARDIO = /\b(run|running|jog|jogging|sprint|sprints|treadmill|cycl\w*|bike|biking|spin|row|rowing machine|rower|elliptical|stair ?climber|stairmaster|step[- ]?ups? cardio|jump(ing)? rope|skipping|swim\w*|walk|walking|hiit|cardio|burpees?|jumping jacks?|mountain climbers?|high knees)\b/i
// "Barbell Row", "Seated Row" etc. are strength; only a rowing machine is cardio.
const STRENGTH_ROW = /\b(barbell|dumbbell|cable|seated|bent[- ]over|t-bar|inverted|upright|pendlay|single[- ]arm)\s+row/i

export function exerciseKind(name: string): ExerciseKind {
  if (STRENGTH_ROW.test(name)) return 'strength'
  return CARDIO.test(name) ? 'cardio' : 'strength'
}

const ymd = (d: Date) => d.toISOString().slice(0, 10)

export function progressWindowStart(range: ProgressRange, now: Date): Date {
  const days = range === 'week' ? 7 : 28
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return new Date(today - (days - 1) * DAY_MS)
}

export function buildProgress(rows: CompletedExercise[], { range, now }: { range: ProgressRange; now: Date }): ProgressPayload {
  const start = progressWindowStart(range, now).getTime()
  const bucketDays = range === 'week' ? 1 : 7
  const count = range === 'week' ? 7 : 4
  const buckets: ProgressBucket[] = Array.from({ length: count }, (_, i) => {
    const first = new Date(start + i * bucketDays * DAY_MS)
    const last = i === count - 1
    const label = range === 'week'
      ? (last ? 'Today' : WEEKDAY[first.getUTCDay()])
      : (last ? 'This wk' : `Wk ${i + 1}`)
    return { label, start: ymd(first), strength_min: 0, cardio_min: 0 }
  })

  const activeDays = new Set<string>()
  for (const row of rows) {
    const t = Date.parse(`${row.date}T00:00:00Z`)
    const offset = Math.floor((t - start) / DAY_MS)
    if (!Number.isFinite(offset) || offset < 0 || offset >= count * bucketDays) continue
    const bucket = buckets[Math.floor(offset / bucketDays)]
    if (exerciseKind(row.name) === 'cardio') bucket.cardio_min += MINUTES_PER_EXERCISE
    else bucket.strength_min += MINUTES_PER_EXERCISE
    activeDays.add(row.date)
  }

  return {
    range,
    goal_minutes: range === 'week' ? DAILY_GOAL_MINUTES : WEEKLY_GOAL_MINUTES,
    buckets,
    totals: {
      strength_min: buckets.reduce((a, b) => a + b.strength_min, 0),
      cardio_min: buckets.reduce((a, b) => a + b.cardio_min, 0),
      active_days: activeDays.size,
    },
  }
}
