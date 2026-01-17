'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnalyticsPayload, PremiumStatus } from '@/types'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pctText(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${Math.round(v)}%`
}

function formatDateShort(ymd: string) {
  // ymd is YYYY-MM-DD (UTC). Display in user's locale but keep day stable as string label.
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type TrendPoint = { key: string; xLabel: string; value: number | null; tooltip: string }

function TrendLineChart({ points }: { points: TrendPoint[] }) {
  const w = 680
  const h = 190
  const padL = 36
  const padR = 24
  const padT = 14
  const padB = 26

  const hasAny = points.some((p) => p.value != null && Number.isFinite(p.value))
  if (!hasAny) {
    return (
      <div className="h-[190px] flex items-center justify-center text-sm text-slate-300/70">
        No trend data yet — complete a workout to start tracking.
      </div>
    )
  }

  const stepX = points.length > 1 ? (w - padL - padR) / (points.length - 1) : 0
  const yFor = (v: number) => {
    const vv = clamp(v, 0, 100)
    return padT + (1 - vv / 100) * (h - padT - padB)
  }

  // Build a segmented path so missing days don't connect visually
  const segments: Array<Array<{ x: number; y: number; v: number; key: string; tooltip: string }>> = []
  let cur: Array<{ x: number; y: number; v: number; key: string; tooltip: string }> = []
  points.forEach((p, i) => {
    const x = padL + i * stepX
    if (p.value == null || !Number.isFinite(p.value)) {
      if (cur.length) segments.push(cur)
      cur = []
      return
    }
    const v = clamp(p.value, 0, 100)
    cur.push({ x, y: yFor(v), v, key: p.key, tooltip: p.tooltip })
  })
  if (cur.length) segments.push(cur)

  const gridYs = [0, 25, 50, 75, 100]
  const labelEvery = points.length > 14 ? 3 : points.length > 8 ? 2 : 1

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[190px]">
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(16,185,129,0.22)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0.02)" />
        </linearGradient>
      </defs>

      {/* grid */}
      {gridYs.map((g) => {
        const y = yFor(g)
        return (
          <g key={g}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
            <text x={padL - 8} y={y + 4} fontSize="10" fill="rgba(148,163,184,0.7)" textAnchor="end">
              {g}
            </text>
          </g>
        )
      })}

      {/* x labels */}
      {points.map((p, i) => {
        if (i % labelEvery !== 0 && i !== points.length - 1) return null
        const x = padL + i * stepX
        const isFirst = i === 0
        const isLast = i === points.length - 1
        return (
          <text
            key={p.key}
            x={x}
            y={h - 8}
            fontSize="10"
            fill="rgba(148,163,184,0.7)"
            textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
          >
            {p.xLabel}
          </text>
        )
      })}

      {/* trend */}
      {segments.map((seg, si) => {
        const d = seg.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
        const lastX = seg[seg.length - 1].x
        const firstX = seg[0].x
        return (
          <g key={si}>
            <path d={d} fill="none" stroke="rgba(16,185,129,0.92)" strokeWidth="2.5" strokeLinejoin="round" />
            <path
              d={`${d} L ${lastX.toFixed(2)} ${(h - padB).toFixed(2)} L ${firstX.toFixed(2)} ${(h - padB).toFixed(2)} Z`}
              fill="url(#trendFill)"
            />
            {seg.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3.1" fill="rgba(16,185,129,0.95)" />
                <title>
                  {p.tooltip}
                </title>
              </g>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full'

function detectMuscleGroup(label: string): MuscleGroup {
  const s = (label || '').toLowerCase()
  if (/(leg|lower|glute|quad|hamstring|calf)/.test(s)) return 'legs'
  if (/(chest|bench|pec)/.test(s)) return 'chest'
  if (/(back|pull|row|lat)/.test(s)) return 'back'
  if (/(shoulder|deltoid|overhead)/.test(s)) return 'shoulders'
  if (/(arm|bicep|tricep|curl)/.test(s)) return 'arms'
  if (/(core|abs|abdominal|plank)/.test(s)) return 'core'
  return 'full'
}

function muscleLabel(group: MuscleGroup): string {
  switch (group) {
    case 'legs':
      return 'Legs'
    case 'chest':
      return 'Chest'
    case 'back':
      return 'Back'
    case 'shoulders':
      return 'Shoulders'
    case 'arms':
      return 'Arms'
    case 'core':
      return 'Core'
    default:
      return 'Full body'
  }
}

function MuscleIcon({ group }: { group: MuscleGroup }) {
  const common = 'w-5 h-5'
  switch (group) {
    case 'legs':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M10 3c1.8 0 3 1.2 3 3v3c0 1.2.8 2 2 2h1v7c0 1.1-.9 2-2 2h-2v-7h-2v7H8c-1.1 0-2-.9-2-2v-7h1c1.2 0 2-.8 2-2V6c0-1.8 1.2-3 3-3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'chest':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.5 6.5c2 0 3 1.5 3.5 3.5.6 2.6 1.2 4 2 4s1.4-1.4 2-4c.5-2 1.5-3.5 3.5-3.5 2.2 0 3.5 1.8 3.5 4.5 0 5-4.5 9-9 9s-9-4-9-9c0-2.7 1.3-4.5 3.5-4.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'back':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 4h8c2.2 0 4 1.8 4 4v6c0 3.9-3.1 7-7 7h-2c-3.9 0-7-3.1-7-7V8c0-2.2 1.8-4 4-4Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M12 7v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    case 'shoulders':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 10c0-2.8 2.2-5 5-5s5 2.2 5 5v1c2 .3 3.5 2 3.5 4v4H3.5v-4c0-2 1.5-3.7 3.5-4v-1Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'arms':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 13c0-2 1.6-3.5 3.5-3.5H13v-2c0-1.4 1.1-2.5 2.5-2.5H17v3l2 2v4c0 3.3-2.7 6-6 6h-3c-2.8 0-5-2.2-5-5v-2c0-1.1.9-2 2-2h1Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'core':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3c3 0 5 3 5 6v6c0 3-2 6-5 6s-5-3-5-6V9c0-3 2-6 5-6Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M9 9h6M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
        </svg>
      )
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          <path d="M12 8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
  }
}

function StreakCalendar({ days }: { days: AnalyticsPayload['calendar'] }) {
  // Render last 84 days (12 weeks) like GitHub grid
  const slice = days.slice(-84)
  if (!slice.length) {
    return (
      <div className="text-sm text-slate-300/70">
        No streak data yet — complete exercises to start your calendar.
      </div>
    )
  }

  // Build rows by weekday (Mon..Sun) in UTC to be consistent with server dates.
  const weekday = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number)
    const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
    const wd = dt.getUTCDay() // 0..6 (Sun..Sat)
    return (wd + 6) % 7 // 0..6 (Mon..Sun)
  }

  const startPad = weekday(slice[0].date)
  const padCells: Array<AnalyticsPayload['calendar'][number] | null> = Array.from({ length: startPad }, () => null)
  const cells: Array<AnalyticsPayload['calendar'][number] | null> = padCells.concat(slice)
  const weeks = Math.ceil(cells.length / 7)

  const color = (v: number | null, workouts: number) => {
    if (!workouts || v == null) return 'bg-white/5 border-white/10'
    if (v >= 85) return 'bg-emerald-400/70 border-emerald-300/30'
    if (v >= 60) return 'bg-emerald-400/45 border-emerald-300/25'
    if (v >= 35) return 'bg-amber-400/35 border-amber-300/25'
    return 'bg-rose-400/30 border-rose-300/25'
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {Array.from({ length: weeks }, (_, wi) => {
        const col = cells.slice(wi * 7, wi * 7 + 7)
        return (
          <div key={wi} className="grid grid-rows-7 gap-1">
            {col.map((c, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-[5px] border ${color(c?.completion_percentage ?? null, c?.workouts ?? 0)}`}
                title={
                  c
                    ? `${c.date}: ${c.workouts ? `${c.workouts} workout(s), ${pctText(c.completion_percentage)}` : 'No workout'}`
                    : ''
                }
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

interface AnalyticsViewProps {
  premiumStatus: PremiumStatus
  onUpgrade: () => void
}

export function AnalyticsView({ premiumStatus, onUpgrade }: AnalyticsViewProps) {
  if (!premiumStatus.access) {
    const trialEndedText =
      premiumStatus.trial_end ? new Date(premiumStatus.trial_end).toLocaleString() : null
    return (
      <div className="pb-24 px-4 py-6">
        <div className="glass rounded-2xl p-8 border border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Analytics (Pro)</h2>
              <p className="text-slate-300/70 text-sm leading-relaxed">
                {trialEndedText
                  ? `Your free trial ended on ${trialEndedText}. Upgrade to unlock your progress dashboard: workout history, completion trends, and consistency insights.`
                  : 'Upgrade to unlock your progress dashboard: workout history, completion trends, and consistency insights.'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-200 border border-amber-400/20">
              Premium
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            {[
              'History of your last ~10 workouts',
              'Completion % by day and week',
              'Streaks and consistency calendar',
              'Most skipped exercises',
            ].map((t) => (
              <div key={t} className="glass-soft rounded-xl p-3 text-sm text-slate-200/85 border border-white/10">
                {t}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onUpgrade}
              className="px-5 py-3 rounded-2xl font-semibold text-sm bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition"
            >
              Upgrade for ₹1/month
            </button>
            <div className="text-xs text-slate-300/60 self-center">
              Status: {premiumStatus.status ?? 'not subscribed'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isTrial = !premiumStatus.premium && premiumStatus.trial_active
  const trialEndsText =
    premiumStatus.trial_end ? new Date(premiumStatus.trial_end).toLocaleString() : null

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [trendMode, setTrendMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [openIconKey, setOpenIconKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/analytics?days=90', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((json as any)?.error || 'Failed to load analytics')
        }
        if (!cancelled) setData(json as AnalyticsPayload)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!cancelled) setError(msg || 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const trendPoints = useMemo<TrendPoint[]>(() => {
    if (!data) return []

    if (trendMode === 'daily') {
      const cal = data.calendar.slice(-30)
      return cal.map((d) => ({
        key: d.date,
        xLabel: formatDateShort(d.date),
        value: d.workouts ? d.completion_percentage : null,
        tooltip: `${d.date}: ${d.workouts ? `${d.workouts} workout(s), ${pctText(d.completion_percentage)}` : 'No workout'}`,
      }))
    }

    if (trendMode === 'monthly') {
      const pts = (data.trends.monthly ?? []).slice(-12)
      return pts.map((m) => {
        const [y, mo] = m.month.split('-').map(Number)
        const dt = new Date(Date.UTC(y || 1970, (mo || 1) - 1, 1))
        const xLabel = dt.toLocaleDateString(undefined, { month: 'short' })
        return {
          key: m.month,
          xLabel,
          value: m.workouts ? m.completion_percentage : null,
          tooltip: `${m.month}: ${m.workouts} workout(s), ${pctText(m.completion_percentage)}`,
        }
      })
    }

    const pts = (data.trends.weekly ?? []).slice(-12)
    return pts.map((w) => {
      const xLabel = w.week.includes('-W') ? w.week.split('-W')[1] : w.week
      return {
        key: w.week,
        xLabel: `W${xLabel}`,
        value: w.workouts ? w.completion_percentage : null,
        tooltip: `${w.week}: ${w.workouts} workout(s), ${pctText(w.completion_percentage)}`,
      }
    })
  }, [data, trendMode])

  const historyThumbs = useMemo(() => {
    return (data?.workout_history ?? []).map((w) => ({
      key: `${w.routine_id}-${w.day_index}-${w.workout_at}`,
      date: w.date,
      dayName: w.day_name,
      completion: w.completion_percentage,
      completed: w.completed_exercises,
      total: w.total_exercises,
      week: w.week_number,
      group: detectMuscleGroup(w.day_name),
    }))
  }, [data])

  return (
    <div className="pb-24 px-4 py-6">
      <div className="glass rounded-2xl p-8 border border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Analytics</h2>
            <p className="text-slate-300/70 text-sm leading-relaxed">
              {isTrial
                ? 'Your free trial is active. Your analytics will appear here. (Next: charts + history panels.)'
                : 'Your Pro analytics will appear here. (Next: charts + history panels.)'}
            </p>
          </div>
          {isTrial ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-400/10 text-cyan-200 border border-cyan-400/20">
              Trial Active
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400/10 text-emerald-200 border border-emerald-400/20">
              Pro Active
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <div className="glass-soft rounded-xl p-4 border border-white/10">
            <div className="text-sm font-semibold text-white">{isTrial ? 'Trial' : 'Subscription'}</div>
            <div className="text-xs text-slate-300/70 mt-1">
              Status: {premiumStatus.status ?? 'unknown'}
            </div>
            {isTrial && trialEndsText && (
              <div className="text-xs text-slate-300/70 mt-1">
                Trial ends: {trialEndsText}
              </div>
            )}
            {premiumStatus.current_end && (
              <div className="text-xs text-slate-300/70 mt-1">
                Current period ends: {new Date(premiumStatus.current_end).toLocaleString()}
              </div>
            )}
          </div>

          <div className="glass-soft rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Streaks</div>
                <div className="text-xs text-slate-300/70 mt-1">Stay consistent — even small sessions count.</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">{data ? `${data.streak.current} day` : '—'}</div>
                <div className="text-[11px] text-slate-300/70">Longest: {data ? `${data.streak.longest} day` : '—'}</div>
              </div>
            </div>
            {data?.streak?.last_workout_date && (
              <div className="text-[11px] text-slate-300/70 mt-2">
                Last workout: {formatDateShort(data.streak.last_workout_date)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="glass-soft rounded-xl p-4 border border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Completion trends</div>
                <div className="text-xs text-slate-300/70 mt-1">
                  {trendMode === 'daily'
                    ? 'Daily (last 30 days)'
                    : trendMode === 'weekly'
                      ? 'Weekly (last 12 weeks)'
                      : 'Monthly (last 12 months)'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-300/70">Workouts</div>
                <div className="text-sm font-bold text-white">
                  {data ? (data.calendar?.reduce((a, d) => a + (d.workouts || 0), 0) ?? 0) : '—'}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTrendMode(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    trendMode === m
                      ? 'bg-emerald-400/12 border-emerald-400/25 text-emerald-100'
                      : 'bg-white/5 border-white/10 text-slate-200/80 hover:bg-white/10'
                  }`}
                >
                  {m === 'daily' ? 'Daily' : m === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="h-[160px] animate-pulse rounded-xl bg-white/5 border border-white/10" />
              ) : error ? (
                <div className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  {error}
                </div>
              ) : (
                <TrendLineChart points={trendPoints} />
              )}
            </div>
          </div>

          <div className="glass-soft rounded-xl p-4 border border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Streak calendar</div>
                <div className="text-xs text-slate-300/70 mt-1">Last 12 weeks</div>
              </div>
              <div className="text-xs text-slate-300/70">Darker = higher completion</div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-[70px] animate-pulse rounded-xl bg-white/5 border border-white/10" />
              ) : error ? (
                <div className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  {error}
                </div>
              ) : (
                <StreakCalendar days={data?.calendar ?? []} />
              )}
            </div>
          </div>

          <div className="glass-soft rounded-xl p-4 border border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Workout history</div>
                <div className="text-xs text-slate-300/70 mt-1">Last 10 workouts</div>
              </div>
              <div className="text-xs text-slate-300/70">Completion %</div>
            </div>

            {!loading && !error && (data?.workout_history?.length ?? 0) > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {historyThumbs.map((w) => (
                  <div
                    key={w.key}
                    className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/7 transition p-3 flex items-center gap-3"
                    title={`${w.date} · ${w.dayName} · ${pctText(w.completion)}`}
                  >
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenIconKey((prev) => (prev === w.key ? null : w.key))}
                        className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/15 text-emerald-200 flex items-center justify-center"
                        title={`Muscle group: ${muscleLabel(w.group)}`}
                        aria-label={`Muscle group: ${muscleLabel(w.group)}`}
                      >
                        <MuscleIcon group={w.group} />
                      </button>
                      {openIconKey === w.key && (
                        <div className="absolute left-0 top-11 z-20 w-44 rounded-xl bg-slate-950/90 border border-white/10 text-[11px] text-slate-100 px-3 py-2 shadow-xl">
                          <div className="font-semibold">{muscleLabel(w.group)}</div>
                          <div className="text-slate-200/75 mt-0.5">This icon represents the workout’s main muscle group.</div>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-white font-semibold truncate">{formatDateShort(w.date)}</div>
                      <div className="text-[11px] text-slate-300/70 truncate">{w.dayName}</div>
                    </div>
                    <div className="ml-auto text-sm font-semibold text-emerald-200 shrink-0">{pctText(w.completion)}</div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && (data?.workout_history?.length ?? 0) > 0 && (
              <div className="mt-4 grid gap-2">
                {data!.workout_history.map((w) => (
                  <div key={`${w.routine_id}-${w.day_index}-${w.workout_at}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">
                        {formatDateShort(w.date)} · {w.day_name}
                      </div>
                      <div className="text-[11px] text-slate-300/70">
                        {w.day_name.toLowerCase().includes('rest')
                          ? 'Rest day completed'
                          : `${w.completed_exercises}/${w.total_exercises} exercises`}
                        {w.week_number != null ? ` · Week ${w.week_number}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-emerald-200">{pctText(w.completion_percentage)}</div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && (data?.workout_history?.length ?? 0) === 0 && (
              <div className="text-sm text-slate-300/70 mt-3">
                No workouts detected yet. Mark exercises as completed in the Workout tab to start building analytics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

