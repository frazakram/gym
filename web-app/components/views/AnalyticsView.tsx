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

function MiniLineChart({ points }: { points: Array<{ xLabel: string; value: number }> }) {
  const w = 520
  const h = 160
  const pad = 16

  if (!points.length) {
    return (
      <div className="h-[160px] flex items-center justify-center text-sm text-slate-300/70">
        No data yet — complete a workout to see trends.
      </div>
    )
  }

  const values = points.map((p) => clamp(p.value, 0, 100))
  const minV = 0
  const maxV = 100
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0

  const pts = values.map((v, i) => {
    const x = pad + i * stepX
    const y = pad + (1 - (v - minV) / (maxV - minV)) * (h - pad * 2)
    return { x, y, v }
  })

  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[160px]">
      <defs>
        <linearGradient id="trend" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(16,185,129,0.28)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0.02)" />
        </linearGradient>
      </defs>

      <path d={d} fill="none" stroke="rgba(16,185,129,0.9)" strokeWidth="2.5" strokeLinejoin="round" />
      <path
        d={`${d} L ${pad + (points.length - 1) * stepX} ${h - pad} L ${pad} ${h - pad} Z`}
        fill="url(#trend)"
      />

      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.2" fill="rgba(16,185,129,0.95)" />
        </g>
      ))}
    </svg>
  )
}

function MiniBarChart({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map((x) => x.value))
  if (!items.length) return null

  return (
    <div className="grid grid-cols-10 gap-2 items-end">
      {items.slice(0, 10).map((it) => {
        const h = clamp((it.value / max) * 100, 0, 100)
        return (
          <div key={it.label} className="flex flex-col items-center gap-2">
            <div className="w-full h-20 flex items-end">
              <div
                className="w-full rounded-md bg-emerald-400/30 border border-emerald-400/20"
                style={{ height: `${Math.max(6, h)}%` }}
                title={`${it.label}: ${pctText(it.value)}`}
              />
            </div>
            <div className="text-[10px] text-slate-300/70 text-center leading-tight truncate w-full" title={it.label}>
              {it.label}
            </div>
          </div>
        )
      })}
    </div>
  )
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

  const last30 = useMemo(() => {
    const daily = data?.trends?.daily ?? []
    return daily.slice(-30)
  }, [data])

  const trendPoints = useMemo(() => {
    return last30.map((p) => ({ xLabel: p.date, value: p.completion_percentage }))
  }, [last30])

  const historyBars = useMemo(() => {
    const items = (data?.workout_history ?? []).slice().reverse()
    return items.map((w) => ({ label: formatDateShort(w.date), value: w.completion_percentage }))
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
                <div className="text-xs text-slate-300/70 mt-1">Last 30 days (weighted by total exercises)</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-300/70">Workouts</div>
                <div className="text-sm font-bold text-white">
                  {data ? (data.calendar?.reduce((a, d) => a + (d.workouts || 0), 0) ?? 0) : '—'}
                </div>
              </div>
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="h-[160px] animate-pulse rounded-xl bg-white/5 border border-white/10" />
              ) : error ? (
                <div className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  {error}
                </div>
              ) : (
                <MiniLineChart points={trendPoints} />
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
            <div className="mt-3">{!loading && !error ? <MiniBarChart items={historyBars} /> : null}</div>

            {!loading && !error && (data?.workout_history?.length ?? 0) > 0 && (
              <div className="mt-4 grid gap-2">
                {data!.workout_history.map((w) => (
                  <div key={`${w.routine_id}-${w.day_index}-${w.workout_at}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">
                        {formatDateShort(w.date)} · {w.day_name}
                      </div>
                      <div className="text-[11px] text-slate-300/70">
                        {w.completed_exercises}/{w.total_exercises} exercises
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

