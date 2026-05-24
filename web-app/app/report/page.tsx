'use client'

import { useEffect, useRef, useState } from 'react'
import { BodySvgShared } from '@/components/BodySvgShared'
import { muscleLabel, type MuscleGroup } from '@/lib/exercise-muscles'
import type {
  WeeklyReportData,
  WeeklyDeltas,
  PushPullSplit,
  ImbalanceFlag,
} from '@/lib/report-utils'
import { generateWeeklyReportData } from '@/lib/report-utils'
import { WeeklyRoutine, Profile, BodyCompositionAnalysis, BodyPhoto } from '@/types'
import {
  Download,
  Loader2,
  ChevronLeft,
  Flame,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Moon,
  Dumbbell,
  Camera,
  AlertTriangle,
  Sparkles,
  Trophy,
} from 'lucide-react'

// ============================================================
// SHARED VISUAL HELPERS
// ============================================================

function heatColor(pct: number): string {
  if (pct <= 0) return 'rgba(122, 148, 144, 0.12)'
  if (pct <= 5) return 'rgba(0, 229, 188, 0.18)'
  if (pct <= 10) return 'rgba(0, 229, 188, 0.35)'
  if (pct <= 18) return 'rgba(0, 229, 188, 0.55)'
  if (pct <= 25) return 'rgba(0, 229, 188, 0.75)'
  return 'rgba(0, 229, 188, 0.92)'
}

function heatBadgeClass(pct: number): string {
  if (pct <= 0) return 'bg-white/5 text-white/30 border-white/10'
  if (pct <= 10) return 'bg-primary/10 text-primary-light border-primary/20'
  if (pct <= 20) return 'bg-primary/20 text-primary-light border-primary/30'
  return 'bg-primary/30 text-white border-primary/40'
}

// ============================================================
// SVG COMPONENTS — sparkline, donut, streak ring, radial
// ============================================================

interface TrendPoint {
  weekNumber: number
  weekStartDate: string | null
  completionPercentage: number
}

/** 8-week completion-% sparkline. */
function Sparkline({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-white/30">
        Not enough history to plot yet — come back next week.
      </div>
    )
  }
  // viewBox: padding gives space for dots
  const W = 320
  const H = 96
  const PAD_X = 12
  const PAD_Y = 14
  const innerW = W - PAD_X * 2
  const innerH = H - PAD_Y * 2

  // y = 100% maps to top, 0% to bottom
  const xFor = (i: number) =>
    points.length === 1 ? W / 2 : PAD_X + (i / (points.length - 1)) * innerW
  const yFor = (pct: number) => PAD_Y + (1 - pct / 100) * innerH

  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.completionPercentage).toFixed(1)}`)
    .join(' ')
  const areaD = `${lineD} L ${xFor(points.length - 1).toFixed(1)} ${H - PAD_Y} L ${xFor(0).toFixed(1)} ${H - PAD_Y} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" aria-label="Weekly completion trend">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,229,188,0.35)" />
          <stop offset="100%" stopColor="rgba(0,229,188,0)" />
        </linearGradient>
      </defs>
      {/* Grid lines at 0, 50, 100% */}
      {[0, 50, 100].map((g) => (
        <line
          key={g}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={yFor(g)}
          y2={yFor(g)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
          strokeDasharray="2 3"
        />
      ))}
      <path d={areaD} fill="url(#sparkArea)" />
      <path d={lineD} fill="none" stroke="rgba(0,229,188,0.95)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={xFor(i)}
            cy={yFor(p.completionPercentage)}
            r={3}
            fill={i === points.length - 1 ? 'rgba(0,229,188,1)' : 'rgba(0,229,188,0.6)'}
            stroke="#0a0a1a"
            strokeWidth={1.5}
          />
        </g>
      ))}
      {/* X-axis labels (week N) */}
      {points.map((p, i) => (
        <text
          key={`lbl-${i}`}
          x={xFor(i)}
          y={H - 2}
          textAnchor="middle"
          fontSize={8}
          className="fill-white/40"
        >
          W{p.weekNumber}
        </text>
      ))}
    </svg>
  )
}

/** Donut chart for push/pull/legs/core split. */
function PushPullDonut({ split }: { split: PushPullSplit }) {
  const SIZE = 140
  const R = 54
  const STROKE = 18
  const C = 2 * Math.PI * R
  const total = split.push + split.pull + split.legs + split.core
  if (total === 0) {
    return (
      <div className="w-[140px] h-[140px] flex items-center justify-center text-xs text-white/30 text-center">
        No data yet
      </div>
    )
  }

  const segments = [
    { value: split.push, color: 'rgba(0, 229, 188, 0.9)', label: 'Push' },
    { value: split.pull, color: 'rgba(59, 130, 246, 0.9)', label: 'Pull' },
    { value: split.legs, color: 'rgba(168, 85, 247, 0.9)', label: 'Legs' },
    { value: split.core, color: 'rgba(251, 191, 36, 0.9)', label: 'Core' },
  ]

  let cumulative = 0
  return (
    <div className="flex items-center gap-4">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="Push pull legs core split">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={STROKE}
        />
        {segments.map((seg, i) => {
          if (seg.value === 0) return null
          const dash = (seg.value / 100) * C
          const gap = C - dash
          const rotation = (cumulative / 100) * 360 - 90
          cumulative += seg.value
          return (
            <circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}
              strokeLinecap="butt"
            />
          )
        })}
        {/* Center label */}
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 2}
          textAnchor="middle"
          fontSize={9}
          className="fill-white/50 uppercase"
          style={{ letterSpacing: '0.1em' }}
        >
          Split
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 14}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          className="fill-white"
        >
          {Math.max(split.push, split.pull, split.legs, split.core)}%
        </text>
      </svg>
      <div className="space-y-1.5 text-xs">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-white/70 w-12">{seg.label}</span>
            <span className="text-white font-semibold">{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Streak ring showing current vs longest. */
function StreakRing({ current, longest }: { current: number; longest: number }) {
  const SIZE = 88
  const STROKE = 8
  const R = (SIZE - STROKE) / 2
  const C = 2 * Math.PI * R
  // Progress is current / max(longest, 7) — never go above 100%
  const target = Math.max(longest, 7, current)
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const offset = C - (pct / 100) * C

  return (
    <svg width={SIZE} height={SIZE} aria-label="Workout streak">
      <defs>
        <linearGradient id="streakGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(251, 146, 60, 1)" />
          <stop offset="100%" stopColor="rgba(244, 63, 94, 1)" />
        </linearGradient>
      </defs>
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        stroke="url(#streakGrad)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
      <text x="50%" y="48%" dominantBaseline="central" textAnchor="middle" className="fill-white font-bold" fontSize={20}>
        {current}
      </text>
      <text x="50%" y="68%" textAnchor="middle" className="fill-white/40" fontSize={8}>
        day{current === 1 ? '' : 's'}
      </text>
    </svg>
  )
}

/** Generic radial progress used for completion %. */
function RadialProgress({ pct, size = 120, strokeWidth = 10 }: { pct: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="print:mx-auto">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(122,148,144,0.15)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#reportGrad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="reportGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(0,229,188,1)" />
          <stop offset="100%" stopColor="rgba(59,130,246,1)" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-white font-bold" fontSize={size * 0.22}>
        {pct}%
      </text>
    </svg>
  )
}

/** Delta pill — shows ▲+5 or ▼-3 with appropriate color. */
function DeltaPill({ value, unit = 'pts' }: { value: number; unit?: string }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-white/40 font-medium">
        no change
      </span>
    )
  }
  const positive = value > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
        positive ? 'text-emerald-400' : 'text-rose-400'
      }`}
    >
      {positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {positive ? '+' : ''}
      {value}
      {unit && <span className="text-white/40 font-normal ml-0.5">{unit}</span>}
    </span>
  )
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

interface ReportApiResponse {
  routine: {
    id: number
    week_number: number
    week_start_date: string | null
    created_at: string
    routine_json: WeeklyRoutine
  }
  exerciseCompletions: Record<string, boolean>
  dayCompletions: Record<string, boolean>
  profile: (Pick<Profile, 'name' | 'age' | 'weight' | 'height' | 'gender' | 'goal' | 'level' | 'goal_weight' | 'goal_duration'> & {
    body_photos?: BodyPhoto[]
    body_composition_analysis?: BodyCompositionAnalysis | null
  }) | null
  deltas: WeeklyDeltas
  split: PushPullSplit
  imbalance: ImbalanceFlag | null
  trend: TrendPoint[]
  streak: { current: number; longest: number; last_workout_date: string | null }
  coachNote: { text: string; generatedAt: string } | null
}

// ============================================================
// PAGE
// ============================================================

export default function ReportPage() {
  const [data, setData] = useState<ReportApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingPdf, setSavingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const reportRef = useRef<HTMLDivElement | null>(null)

  /**
   * Generate PDF client-side via html2canvas-pro + jsPDF.
   *
   * Why this stack:
   * - Vanilla html2canvas chokes on Tailwind v4's modern color functions
   *   (`oklch()`, `lab()`, `color-mix()`) — throws "unexpected color function".
   * - `html2canvas-pro` is a community fork that natively understands them.
   * - Works on Android PWA standalone, iOS Safari, and desktop — unlike
   *   `window.print()` which is only available in browser display-mode on Android.
   *
   * Libraries are dynamically imported so they don't bloat the initial bundle.
   */
  const handleSavePdf = async () => {
    if (!reportRef.current || savingPdf) return
    setSavingPdf(true)
    setPdfError('')
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])

      const element = reportRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a1a',
        // Hide the floating action bar (and any other .no-print elements)
        // in the cloned doc before rendering — those should never be in the PDF
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('.no-print').forEach((el) => {
            ;(el as HTMLElement).style.display = 'none'
          })
        },
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)

      // A4 portrait in mm. 210 x 297. 8mm side margin, 10mm top/bottom.
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const sideMargin = 8
      const topMargin = 10
      const bottomMargin = 10
      const imgWidth = pageWidth - sideMargin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const usablePerPage = pageHeight - topMargin - bottomMargin

      // First page
      let heightLeft = imgHeight
      let position = topMargin
      pdf.addImage(imgData, 'JPEG', sideMargin, position, imgWidth, imgHeight)
      heightLeft -= usablePerPage

      // Additional pages — keep adding the same image with a negative y offset
      // so each page shows the next vertical slice
      while (heightLeft > 0) {
        pdf.addPage()
        position = topMargin - (imgHeight - heightLeft)
        pdf.addImage(imgData, 'JPEG', sideMargin, position, imgWidth, imgHeight)
        heightLeft -= usablePerPage
      }

      const weekNum = data?.routine?.week_number ?? 0
      pdf.save(`gymbro-weekly-report-week-${weekNum}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
      setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setSavingPdf(false)
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    const routineId = url.searchParams.get('routineId')
    const endpoint = routineId ? `/api/report?routineId=${routineId}` : '/api/report'

    fetch(endpoint, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const errPayload = await res.json().catch(() => null)
          throw new Error(errPayload?.error || 'Failed to load report data')
        }
        return res.json()
      })
      .then((json) => setData(json as ReportApiResponse))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
          <p className="text-muted mt-4 text-sm">Generating your weekly report…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 text-center max-w-sm border border-rose-500/20">
          <h2 className="text-xl font-bold text-white mb-2">Report Unavailable</h2>
          <p className="text-muted text-sm">{error || 'No data available. Please complete some workouts first.'}</p>
          <a href="/dashboard" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary/15 text-primary-light text-sm font-semibold border border-primary/25 hover:bg-primary/20 transition">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  const { routine, exerciseCompletions, dayCompletions, profile, deltas, split, imbalance, trend, streak, coachNote } = data
  const report: WeeklyReportData = generateWeeklyReportData(
    routine.routine_json,
    exerciseCompletions,
    dayCompletions,
    typeof profile?.weight === 'number' ? profile.weight : undefined,
  )
  const bodyAnalysis = profile?.body_composition_analysis
  const bodyPhotos = profile?.body_photos ?? []
  const latestPhoto = bodyPhotos.length > 0 ? bodyPhotos[bodyPhotos.length - 1] : null

  // Goal progress (weight): need current weight + goal weight. Show only if both exist
  // and trending toward the goal (i.e. there's a delta to track).
  const hasGoalProgress =
    typeof profile?.weight === 'number' && typeof profile?.goal_weight === 'number' && profile.weight !== profile.goal_weight
  let goalProgressPct = 0
  let goalDeltaKg = 0
  let goalDirection: 'lose' | 'gain' = 'lose'
  if (hasGoalProgress && profile) {
    const w = profile.weight as number
    const target = profile.goal_weight as number
    goalDirection = target < w ? 'lose' : 'gain'
    // We don't have starting weight tracked, so just show "kg to go" — honest.
    goalDeltaKg = Math.abs(w - target)
    // Use a coarse heuristic: assume 10% deviation = 0%, target = 100%
    const span = Math.max(Math.abs(w - target), 0.001)
    goalProgressPct = Math.max(0, Math.min(100, 100 - (span / Math.max(w, target)) * 100))
  }

  // Sorted muscles by activation for the breakdown bars
  const sortedMuscles = (Object.entries(report.muscleActivation) as [MuscleGroup, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)

  const imbalanceTone = imbalance
    ? imbalance.severity === 'severe'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
      : imbalance.severity === 'moderate'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
        : 'border-yellow-500/25 bg-yellow-500/8 text-yellow-100'
    : ''

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body { background: #0a0a1a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          .report-page { padding: 0 !important; }
        }
        @page { size: A4; margin: 16mm 12mm; }
      `}</style>

      <div ref={reportRef} className="min-h-screen bg-[#0a0a1a] report-page">
        {/* Floating action bar — hidden on print AND stripped from PDF capture via onclone */}
        <div className="no-print sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a1a]/80 border-b border-primary/10 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition">
              <ChevronLeft className="w-4 h-4" /> Dashboard
            </a>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSavePdf}
                disabled={savingPdf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-brand-cyan text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Save as PDF
                  </>
                )}
              </button>
            </div>
          </div>
          {pdfError && (
            <div className="max-w-2xl mx-auto mt-2 text-xs text-rose-300 text-right">
              {pdfError}
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {/* ========== HEADER ========== */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <Dumbbell className="w-6 h-6 text-primary-light" />
              <span className="text-lg font-bold text-white font-display tracking-tight">GymBro AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
              Weekly Progress Report
            </h1>
            <p className="text-muted text-sm mt-1.5">
              Week {routine.week_number}
              {routine.week_start_date && ` · Starting ${new Date(routine.week_start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </p>
          </div>

          {/* ========== USER OVERVIEW + GOAL PROGRESS ========== */}
          {profile && (
            <div className="glass rounded-2xl p-5 border border-primary/10 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-lg font-semibold text-white">{profile.name || 'Athlete'}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {profile.goal} · {profile.level}
                    {profile.age ? ` · ${profile.age}y` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-center">
                  {profile.weight && (
                    <div>
                      <p className="text-sm font-bold text-white">{profile.weight}<span className="text-xs text-muted ml-0.5">kg</span></p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Current</p>
                    </div>
                  )}
                  {profile.goal_weight && (
                    <div>
                      <p className="text-sm font-bold text-primary-light">{profile.goal_weight}<span className="text-xs text-muted ml-0.5">kg</span></p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Goal</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Goal progress bar */}
              {hasGoalProgress && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted">
                      {goalDirection === 'lose' ? 'Weight to lose' : 'Weight to gain'}: <span className="text-white font-semibold">{goalDeltaKg.toFixed(1)} kg</span>
                    </span>
                    <span className="text-primary-light font-semibold">{Math.round(goalProgressPct)}% there</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-brand-cyan transition-all duration-700"
                      style={{ width: `${goalProgressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== ACHIEVEMENTS ROW — 4 tiles with deltas ========== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Completion */}
            <div className="glass rounded-2xl p-4 border border-primary/10 text-center">
              <RadialProgress pct={report.completionPercentage} size={80} strokeWidth={7} />
              <p className="text-[10px] text-muted uppercase tracking-wider mt-2">Completion</p>
              <div className="mt-1"><DeltaPill value={deltas.completionDelta} unit="pts" /></div>
            </div>

            {/* XP */}
            <div className="glass rounded-2xl p-4 border border-primary/10 text-center flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-white">{report.weeklyXp.toLocaleString()}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">XP Earned</p>
              <DeltaPill value={deltas.xpDelta} unit="xp" />
            </div>

            {/* Streak ring (replaces fake calories) */}
            <div className="glass rounded-2xl p-4 border border-primary/10 text-center flex flex-col items-center justify-center gap-1">
              <StreakRing current={streak.current} longest={streak.longest} />
              <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Streak · Best {streak.longest}</p>
            </div>

            {/* Days done */}
            <div className="glass rounded-2xl p-4 border border-primary/10 text-center flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white">{report.completedDaysCount}<span className="text-sm text-muted">/{report.totalDaysCount}</span></p>
              <p className="text-[10px] text-muted uppercase tracking-wider">Days Done</p>
              <DeltaPill value={deltas.completedDaysDelta} unit="" />
            </div>
          </div>

          {/* ========== AI COACH NOTE ========== */}
          {coachNote && (
            <div className="rounded-2xl p-5 border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-cyan-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                </div>
                <h2 className="text-sm font-semibold text-white">Coach&apos;s Note</h2>
              </div>
              <p className="text-sm text-white/85 leading-relaxed">{coachNote.text}</p>
            </div>
          )}

          {/* ========== IMBALANCE CALLOUT ========== */}
          {imbalance && (
            <div className={`rounded-2xl p-4 border ${imbalanceTone} flex items-start gap-3`}>
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-0.5">
                  {imbalance.type === 'push_heavy' && 'Push-Heavy Week'}
                  {imbalance.type === 'pull_heavy' && 'Pull-Heavy Week'}
                  {imbalance.type === 'legs_neglected' && 'Legs Got Skipped'}
                  {imbalance.type === 'quad_dominant' && 'Quad-Dominant Lower Body'}
                  {imbalance.type === 'core_neglected' && 'Light on Core'}
                </p>
                <p className="text-xs opacity-90 leading-relaxed">{imbalance.message}</p>
              </div>
            </div>
          )}

          {/* ========== TREND SPARKLINE (last 8 weeks) ========== */}
          <div className="glass rounded-2xl p-5 border border-primary/10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-base font-semibold text-white">Completion Trend</h2>
                <p className="text-xs text-muted mt-0.5">Last {trend.length} week{trend.length === 1 ? '' : 's'}</p>
              </div>
              <Trophy className="w-5 h-5 text-amber-400/70" />
            </div>
            <Sparkline points={trend} />
          </div>

          {/* ========== PRIMARY FOCUS HIGHLIGHT ========== */}
          <div className="glass rounded-2xl p-4 border border-primary/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-light" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Primary Focus: {report.primaryFocusRegion}</p>
              <p className="text-xs text-muted mt-0.5">
                {report.completedExercises} of {report.totalExercises} exercises completed · {report.estimatedCalories.toLocaleString()} kcal est.
              </p>
            </div>
            <Flame className="w-5 h-5 text-orange-400/60" />
          </div>

          {/* ========== PUSH/PULL/LEGS DONUT ========== */}
          <div className="glass rounded-2xl p-5 border border-primary/10">
            <h2 className="text-base font-semibold text-white mb-1">Movement Pattern Split</h2>
            <p className="text-xs text-muted mb-4">How your work was distributed across the four movement categories</p>
            <PushPullDonut split={split} />
          </div>

          {/* ========== MUSCLE HEATMAP ========== */}
          <div className="glass rounded-2xl p-5 border border-primary/10">
            <h2 className="text-base font-semibold text-white mb-1">Muscle Activation Heatmap</h2>
            <p className="text-xs text-muted mb-4">Brighter regions = higher share of total weekly workload</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-muted text-center mb-2">Front</p>
                <div className="h-64 sm:h-72">
                  <BodySvgShared fillFor={(m) => heatColor(report.muscleActivation[m] ?? 0)} side="front" />
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-muted text-center mb-2">Back</p>
                <div className="h-64 sm:h-72">
                  <BodySvgShared fillFor={(m) => heatColor(report.muscleActivation[m] ?? 0)} side="back" />
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 justify-center flex-wrap">
              {[
                { label: 'Not worked', color: 'rgba(122,148,144,0.12)' },
                { label: 'Low', color: 'rgba(0,229,188,0.25)' },
                { label: 'Medium', color: 'rgba(0,229,188,0.55)' },
                { label: 'High', color: 'rgba(0,229,188,0.92)' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-[4px] border border-white/10" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] text-muted">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ========== MUSCLE BREAKDOWN TABLE ========== */}
          {sortedMuscles.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-primary/10">
              <h2 className="text-base font-semibold text-white mb-3">Body Part Balance</h2>
              <div className="space-y-2">
                {sortedMuscles.map(([muscle, pct]) => (
                  <div key={muscle} className="flex items-center gap-3">
                    <span className="text-xs text-white/80 w-24 truncate">{muscleLabel(muscle)}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-brand-cyan transition-all duration-500"
                        style={{ width: `${Math.min(pct * 3, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${heatBadgeClass(pct)}`}>
                      {pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========== DAY-BY-DAY LOG ========== */}
          <div className="glass rounded-2xl p-5 border border-primary/10 print-break">
            <h2 className="text-base font-semibold text-white mb-3">Day-by-Day Breakdown</h2>
            <div className="space-y-2">
              {routine.routine_json.days.map((day, dIdx) => {
                const isRestDay = (day.exercises?.length || 0) === 0
                const dayDone = dayCompletions[String(dIdx)] === true

                if (isRestDay) {
                  return (
                    <div key={dIdx} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
                      <Moon className="w-4 h-4 text-white/30 shrink-0" />
                      <span className="text-sm text-white/70 flex-1 truncate">{day.day}</span>
                      <span className={`text-xs font-semibold ${dayDone ? 'text-emerald-400' : 'text-white/25'}`}>
                        {dayDone ? '✓ Rested' : 'Rest day'}
                      </span>
                    </div>
                  )
                }

                const completedCount = day.exercises.filter((_, eIdx) =>
                  exerciseCompletions[`${dIdx}-${eIdx}`] === true
                ).length
                const total = day.exercises.length
                const allDone = completedCount === total && total > 0
                const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

                return (
                  <div key={dIdx} className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {allDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : completedCount > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-primary/60 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-white/20 shrink-0" />
                      )}
                      <span className="text-sm text-white/80 flex-1 truncate">{day.day}</span>
                      <span className={`text-xs font-semibold ${allDone ? 'text-emerald-400' : completedCount > 0 ? 'text-primary-light' : 'text-white/30'}`}>
                        {completedCount}/{total}
                      </span>
                    </div>
                    <div className="mt-1.5 ml-7 h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : pct >= 50 ? 'bg-primary' : pct > 0 ? 'bg-primary/50' : 'bg-white/10'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ========== BODY PHOTO & ANALYSIS ========== */}
          {(latestPhoto || bodyAnalysis) && (
            <div className="glass rounded-2xl p-5 border border-primary/10 print-break">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-primary-light" />
                <h2 className="text-base font-semibold text-white">Body Progress</h2>
              </div>

              <div className={`grid gap-4 ${latestPhoto && bodyAnalysis ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Photo */}
                {latestPhoto && (
                  <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-3 flex flex-col items-center">
                    <img
                      src={`data:${latestPhoto.content_type};base64,${latestPhoto.base64}`}
                      alt="Body progress photo"
                      className="max-h-72 rounded-xl object-contain"
                    />
                    <p className="text-[10px] text-muted mt-2">
                      Uploaded {new Date(latestPhoto.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}

                {/* AI Analysis — trimmed: focus areas + posture only (the actionable parts) */}
                {bodyAnalysis && (
                  <div className="space-y-3">
                    {bodyAnalysis.estimated_body_fat_range && (
                      <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Est. Body Fat</p>
                        <p className="text-sm font-semibold text-white">{bodyAnalysis.estimated_body_fat_range}</p>
                      </div>
                    )}

                    <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Muscle Development</p>
                      <p className="text-sm font-semibold text-white capitalize">{bodyAnalysis.muscle_development}</p>
                    </div>

                    {bodyAnalysis.focus_areas && bodyAnalysis.focus_areas.length > 0 && (
                      <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5">AI Focus Areas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {bodyAnalysis.focus_areas.map((area, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/20">
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {bodyAnalysis.posture_notes && bodyAnalysis.posture_notes.length > 0 && (
                      <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Posture Notes</p>
                        <ul className="text-xs text-white/70 space-y-1">
                          {bodyAnalysis.posture_notes.map((note, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-primary-light mt-0.5">•</span> {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== FOOTER ========== */}
          <div className="text-center py-6 border-t border-white/5">
            <p className="text-xs text-muted">
              Generated by <span className="text-primary-light font-semibold">GymBro AI</span> · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
