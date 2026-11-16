'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { Loader2 } from 'lucide-react'
import { csrfFetch } from '@/lib/useCsrf'
import { PageHero } from '../ui/PageHero'
import type { ProgressPayload, ProgressRange } from '@/lib/progress'

/** Chart geometry (viewBox units). */
const VB_W = 360
const VB_H = 230
const X0 = 46
const BASE_Y = 190
const PLOT_H = 170
const PLOT_W = VB_W - X0 - 10
const GAP = 2 // surface gap between stacked segments
const NICE_MAX = [20, 40, 60, 80, 100, 120, 160, 200, 240, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2000]

const RANGE_TEXT: Record<ProgressRange, { label: string; goal: string; aria: string }> = {
  week: { label: 'min this week', goal: 'Daily goal', aria: 'Training minutes per day for the last 7 days' },
  month: { label: 'min this month', goal: 'Weekly goal', aria: 'Training minutes per week for the last 4 weeks' },
}

/** Centre the tooltip on its bar, but keep it inside the card near either edge. */
function tipPosition(fraction: number): CSSProperties {
  if (fraction > 0.7) return { right: `${(1 - fraction) * 100 - 4}%`, left: 'auto', transform: 'none' }
  if (fraction < 0.3) return { left: `${fraction * 100 - 4}%`, transform: 'none' }
  return { left: `${fraction * 100}%` }
}

function niceMax(value: number) {
  return NICE_MAX.find((n) => n >= value) ?? Math.ceil(value / 500) * 500
}

/** Bar with 4px rounded top corners and a square base. */
function barPath(x: number, y: number, w: number, h: number, roundTop: boolean) {
  if (h <= 0) return ''
  const r = roundTop ? Math.min(4, w / 2, h) : 0
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

export function ProgressView({ onBack }: { onBack?: () => void }) {
  const [range, setRange] = useState<ProgressRange>('week')
  const [data, setData] = useState<ProgressPayload | null>(null)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    csrfFetch(`/api/progress?range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ProgressPayload) => { if (alive) { setData(d); setFailed(false) } })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [range])

  const shown = data && data.range === range ? data : null
  const total = shown ? shown.totals.strength_min + shown.totals.cardio_min : 0
  const text = RANGE_TEXT[range]

  const pickRange = (next: ProgressRange) => { setActive(null); setRange(next) }

  return (
    <div className="gb-screen">
      <PageHero title="Progress" subtitle="Training minutes, strength and cardio" onBack={onBack} />
      <div className="gb-stack gb-gutter">
        <div className="gb-total-row gb-rise" style={{ '--i': 0 } as CSSProperties}>
          <div>
            <span className="gb-total gb-num">{shown ? total.toLocaleString('en-IN') : '-'}</span>{' '}
            <span className="gb-total-label">{text.label}</span>
          </div>
          <div className="gb-seg gb-seg-2" role="group" aria-label="Range">
            {(['week', 'month'] as const).map((r) => (
              <button key={r} type="button" aria-pressed={range === r} onClick={() => pickRange(r)} className="gb-press">
                {r === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>

        <div className="gb-card gb-chart-card gb-rise" style={{ '--i': 1 } as CSSProperties}>
          {failed && !shown ? (
            <p className="gb-empty-note" role="alert">Could not load your progress. Pull down to refresh, or try again later.</p>
          ) : !shown ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Loader2 className="gb-spin" aria-label="Loading" /></div>
          ) : (
            <Chart data={shown} active={active} setActive={setActive} aria={`${text.aria}, strength and cardio, with a ${shown.goal_minutes} minute ${text.goal.toLowerCase()}. ${total} minutes in total.`} />
          )}
          {shown && total === 0 && (
            <p className="gb-empty-note">No completed exercises in this range yet. Mark exercises done during a workout and they show up here.</p>
          )}
        </div>

        <div className="gb-legend gb-rise" style={{ '--i': 2 } as CSSProperties}>
          <span><i style={{ background: 'var(--gb-series-strength)' }} />Strength</span>
          <span><i style={{ background: 'var(--gb-series-cardio)' }} />Cardio</span>
          <span><i style={{ borderTop: '2px dashed var(--gb-goal)', width: 18, height: 0, borderRadius: 0 }} />{text.goal}, {shown?.goal_minutes ?? (range === 'week' ? 30 : 210)} min</span>
        </div>

        <div className="gb-kpis gb-rise" style={{ '--i': 3 } as CSSProperties}>
          <div className="gb-kpi"><span className="gb-kpi-v gb-num">{shown?.totals.strength_min ?? '-'}</span><span className="gb-kpi-l">Strength min</span></div>
          <div className="gb-kpi"><span className="gb-kpi-v gb-num">{shown?.totals.cardio_min ?? '-'}</span><span className="gb-kpi-l">Cardio min</span></div>
          <div className="gb-kpi"><span className="gb-kpi-v gb-num">{shown?.totals.active_days ?? '-'}</span><span className="gb-kpi-l">Active days</span></div>
        </div>

        {shown && (
          <details className="gb-table-toggle gb-rise" style={{ '--i': 4 } as CSSProperties}>
            <summary>View as table</summary>
            <table className="gb-table gb-num">
              <thead><tr><th scope="col">{range === 'week' ? 'Day' : 'Week'}</th><th scope="col">Strength</th><th scope="col">Cardio</th><th scope="col">Total</th></tr></thead>
              <tbody>
                {shown.buckets.map((b) => (
                  <tr key={b.start}><td>{b.label}</td><td>{b.strength_min} min</td><td>{b.cardio_min} min</td><td>{b.strength_min + b.cardio_min} min</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
        <p className="gb-empty-note" style={{ textAlign: 'left', padding: 0 }}>Minutes are estimated at 8 per completed exercise.</p>
      </div>
    </div>
  )
}

function Chart({ data, active, setActive, aria }: { data: ProgressPayload; active: number | null; setActive: (i: number | null) => void; aria: string }) {
  const maxStack = Math.max(0, ...data.buckets.map((b) => b.strength_min + b.cardio_min))
  const max = niceMax(Math.max(data.goal_minutes * 1.25, maxStack * 1.1))
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max]
  const y = (v: number) => BASE_Y - (v / max) * PLOT_H
  const step = PLOT_W / data.buckets.length
  const barW = data.range === 'week' ? 22 : 40
  const goalY = y(data.goal_minutes)
  const activeBucket = active !== null ? data.buckets[active] : null

  return (
    <>
      <svg className="gb-chart" viewBox={`0 0 ${VB_W} ${VB_H}`} role="group" aria-label={aria} onMouseLeave={() => setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="gb-grid" x1={X0} x2={VB_W - 10} y1={y(t)} y2={y(t)} />
            <text x={X0 - 8} y={y(t) + 4} textAnchor="end">{Math.round(t)}</text>
          </g>
        ))}
        {data.buckets.map((b, i) => {
          const cx = X0 + step * i + step / 2
          const x = cx - barW / 2
          const sH = (b.strength_min / max) * PLOT_H
          const cH = (b.cardio_min / max) * PLOT_H
          const cardioTop = BASE_Y - sH - cH - (sH > 0 && cH > 0 ? GAP : 0)
          return (
            <g
              key={b.start}
              className={`gb-col${active === i ? ' gb-active' : ''}`}
              tabIndex={0}
              role="img"
              aria-label={`${b.label}: ${b.strength_min} minutes strength, ${b.cardio_min} minutes cardio`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
            >
              <rect className="gb-hit" x={X0 + step * i + 2} y={BASE_Y - PLOT_H} width={step - 4} height={PLOT_H} rx={8} />
              {sH > 0 && <path className="gb-bar gb-strength" style={{ '--i': i } as CSSProperties} d={barPath(x, BASE_Y - sH, barW, sH, cH === 0)} />}
              {cH > 0 && <path className="gb-bar gb-cardio" style={{ '--i': i } as CSSProperties} d={barPath(x, cardioTop, barW, cH, true)} />}
              <text x={cx} y={BASE_Y + 22} textAnchor="middle" style={b.label === 'Today' || b.label === 'This wk' ? { fill: 'var(--gb-ink)', fontWeight: 700 } : undefined}>{b.label}</text>
            </g>
          )
        })}
        <line className="gb-goal" x1={X0} x2={VB_W - 10} y1={goalY} y2={goalY} />
        <text x={VB_W - 10} y={goalY - 6} textAnchor="end">Goal</text>
      </svg>
      {activeBucket && active !== null && (
        <div className="gb-tip gb-num" style={tipPosition((X0 + step * active + step / 2) / VB_W)} aria-hidden="true">
          <b>{activeBucket.label}: {activeBucket.strength_min + activeBucket.cardio_min} min</b><br />
          <i style={{ background: 'var(--gb-series-strength)' }} />Strength {activeBucket.strength_min} min<br />
          <i style={{ background: 'var(--gb-series-cardio)' }} />Cardio {activeBucket.cardio_min} min
        </div>
      )}
    </>
  )
}
