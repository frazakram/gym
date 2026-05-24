'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Target, Loader2 } from 'lucide-react'
import { csrfFetch } from '@/lib/useCsrf'
import {
  getExerciseMuscleInfo,
  muscleLabel,
  regionLabel,
  matchFocusAreas,
  type MuscleGroup,
  type BodyRegion,
} from '@/lib/exercise-muscles'

interface ExerciseInfoResponse {
  exerciseName: string
  primary: MuscleGroup[]
  secondary: MuscleGroup[]
  region: BodyRegion
  benefits: string[]
  personalNote?: string
  matchedFocusAreas?: string[]
  source: 'ai' | 'static' | 'mixed'
  cached: { global: boolean; personal: boolean }
}

interface MuscleMapModalProps {
  open: boolean
  onClose: () => void
  exerciseName: string
  bodyAnalysis?: {
    focus_areas?: string[]
    posture_notes?: string[]
    body_type?: string
  } | null
}

const PRIMARY_FILL = 'rgba(96, 165, 250, 0.9)'
const SECONDARY_FILL = 'rgba(96, 165, 250, 0.4)'
const BASE_FILL = 'rgba(148, 163, 184, 0.18)'
const BASE_STROKE = 'rgba(148, 163, 184, 0.45)'
const SILHOUETTE_FILL = 'rgba(148, 163, 184, 0.08)'

function fillFor(muscle: MuscleGroup, primary: MuscleGroup[], secondary: MuscleGroup[]) {
  if (primary.includes(muscle)) return PRIMARY_FILL
  if (secondary.includes(muscle)) return SECONDARY_FILL
  return BASE_FILL
}

interface BodySvgProps {
  primary: MuscleGroup[]
  secondary: MuscleGroup[]
  side: 'front' | 'back'
}

// Soft silhouette backdrop — simple composite shapes that imply a body outline
// without trying to be one giant closed path. Sits behind the muscle layers.
function Silhouette() {
  const fill = SILHOUETTE_FILL
  const stroke = BASE_STROKE
  const sw = 0.5
  return (
    <g pointerEvents="none">
      {/* Head */}
      <ellipse cx="60" cy="18" rx="13" ry="15" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Torso (V-tapered) */}
      <path
        d="M40 44 Q60 38 80 44 L82 110 Q60 116 38 110 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Hips */}
      <path
        d="M38 110 Q60 118 82 110 L80 140 Q60 144 40 140 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Right arm (upper + lower) */}
      <path
        d="M80 44 Q94 48 94 60 L92 105 L88 128 L80 128 L82 105 L78 60 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Left arm */}
      <path
        d="M40 44 Q26 48 26 60 L28 105 L32 128 L40 128 L38 105 L42 60 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Right leg */}
      <path
        d="M62 140 L80 140 L78 188 L76 230 L68 234 L62 230 L60 188 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Left leg */}
      <path
        d="M58 140 L40 140 L42 188 L44 230 L52 234 L58 230 L60 188 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    </g>
  )
}

function BodySvg({ primary, secondary, side }: BodySvgProps) {
  const f = (m: MuscleGroup) => fillFor(m, primary, secondary)
  const stroke = { stroke: BASE_STROKE, strokeWidth: 0.5, strokeLinejoin: 'round' as const }

  if (side === 'front') {
    return (
      <svg viewBox="0 0 120 240" className="w-full h-full" aria-label="Front body diagram">
        <Silhouette />

        {/* Head */}
        <ellipse cx="60" cy="18" rx="13" ry="15" fill={BASE_FILL} {...stroke} />

        {/* Neck (sternocleidomastoid) */}
        <path d="M54 33 Q60 38 66 33 L65 40 Q60 42 55 40 Z" fill={f('neck')} {...stroke} />

        {/* Trapezius (front view — visible at neck-shoulder slope) */}
        <path d="M50 38 Q60 34 70 38 L74 48 Q60 46 46 48 Z" fill={f('traps')} {...stroke} />

        {/* Deltoids (front fibers) */}
        <path d="M44 44 Q34 44 30 56 Q30 68 38 70 Q44 64 46 50 Z" fill={f('shoulders')} {...stroke} />
        <path d="M76 44 Q86 44 90 56 Q90 68 82 70 Q76 64 74 50 Z" fill={f('shoulders')} {...stroke} />

        {/* Pectorals — sweeping curves with sternal separation */}
        <path d="M46 50 Q54 50 59 56 L59 78 Q55 80 50 78 Q44 70 44 60 Z" fill={f('chest')} {...stroke} />
        <path d="M74 50 Q66 50 61 56 L61 78 Q65 80 70 78 Q76 70 76 60 Z" fill={f('chest')} {...stroke} />

        {/* Biceps */}
        <path d="M30 70 Q26 76 27 90 Q32 96 38 90 Q38 78 36 72 Z" fill={f('biceps')} {...stroke} />
        <path d="M90 70 Q94 76 93 90 Q88 96 82 90 Q82 78 84 72 Z" fill={f('biceps')} {...stroke} />

        {/* Forearms — tapered down to wrist */}
        <path d="M27 92 Q24 108 26 124 L34 124 Q35 108 36 92 Z" fill={f('forearms')} {...stroke} />
        <path d="M93 92 Q96 108 94 124 L86 124 Q85 108 84 92 Z" fill={f('forearms')} {...stroke} />

        {/* Abs — six-pack (3 rows × 2 cols) */}
        <path d="M52 80 L58 80 L58 88 L52 88 Z" fill={f('abs')} {...stroke} />
        <path d="M62 80 L68 80 L68 88 L62 88 Z" fill={f('abs')} {...stroke} />
        <path d="M52 90 L58 90 L58 98 L52 98 Z" fill={f('abs')} {...stroke} />
        <path d="M62 90 L68 90 L68 98 L62 98 Z" fill={f('abs')} {...stroke} />
        <path d="M52 100 L58 100 L58 110 L52 110 Z" fill={f('abs')} {...stroke} />
        <path d="M62 100 L68 100 L68 110 L62 110 Z" fill={f('abs')} {...stroke} />

        {/* Obliques — V-shape flanking the abs */}
        <path d="M44 76 Q48 92 50 112 L52 112 L52 78 Z" fill={f('obliques')} {...stroke} />
        <path d="M76 76 Q72 92 70 112 L68 112 L68 78 Z" fill={f('obliques')} {...stroke} />

        {/* Adductors (inner thigh wedge) */}
        <path d="M52 134 L68 134 L65 152 L60 156 L55 152 Z" fill={f('adductors')} {...stroke} />

        {/* Quads — teardrop with vastus lateralis emphasis */}
        <path d="M42 138 Q38 160 42 184 L52 184 Q54 160 52 138 Z" fill={f('quads')} {...stroke} />
        <path d="M78 138 Q82 160 78 184 L68 184 Q66 160 68 138 Z" fill={f('quads')} {...stroke} />

        {/* Knees (decorative) */}
        <ellipse cx="47" cy="190" rx="5" ry="3" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />
        <ellipse cx="73" cy="190" rx="5" ry="3" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />

        {/* Tibialis (shin) - subtle, not a tracked muscle */}
        <path d="M44 196 Q42 215 46 230 L52 230 Q52 215 50 196 Z" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />
        <path d="M76 196 Q78 215 74 230 L68 230 Q68 215 70 196 Z" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />
      </svg>
    )
  }

  // BACK
  return (
    <svg viewBox="0 0 120 240" className="w-full h-full" aria-label="Back body diagram">
      <Silhouette />

      {/* Head */}
      <ellipse cx="60" cy="18" rx="13" ry="15" fill={BASE_FILL} {...stroke} />

      {/* Neck */}
      <path d="M54 33 Q60 38 66 33 L65 40 Q60 42 55 40 Z" fill={f('neck')} {...stroke} />

      {/* Trapezius — kite spreading from skull to mid-back */}
      <path d="M50 36 Q60 32 70 36 L78 50 L60 62 L42 50 Z" fill={f('traps')} {...stroke} />
      <path d="M42 50 L60 62 L78 50 L74 70 L60 76 L46 70 Z" fill={f('traps')} {...stroke} />

      {/* Rear deltoids */}
      <path d="M44 44 Q34 44 30 56 Q30 68 38 70 Q44 64 46 50 Z" fill={f('shoulders')} {...stroke} />
      <path d="M76 44 Q86 44 90 56 Q90 68 82 70 Q76 64 74 50 Z" fill={f('shoulders')} {...stroke} />

      {/* Upper back (rhomboids / mid-traps) */}
      <path d="M46 70 L74 70 L72 86 L48 86 Z" fill={f('upper_back')} {...stroke} />

      {/* Lats — classic V flowing from armpits to lower back */}
      <path d="M44 70 Q36 84 40 104 L52 110 L52 80 Z" fill={f('lats')} {...stroke} />
      <path d="M76 70 Q84 84 80 104 L68 110 L68 80 Z" fill={f('lats')} {...stroke} />

      {/* Triceps — horseshoe shape on the back of the arm */}
      <path d="M30 70 Q26 76 27 90 Q32 96 38 90 Q38 78 36 72 Z" fill={f('triceps')} {...stroke} />
      <path d="M90 70 Q94 76 93 90 Q88 96 82 90 Q82 78 84 72 Z" fill={f('triceps')} {...stroke} />

      {/* Forearms */}
      <path d="M27 92 Q24 108 26 124 L34 124 Q35 108 36 92 Z" fill={f('forearms')} {...stroke} />
      <path d="M93 92 Q96 108 94 124 L86 124 Q85 108 84 92 Z" fill={f('forearms')} {...stroke} />

      {/* Lower back (erector spinae) */}
      <path d="M52 92 L68 92 Q70 104 68 116 L52 116 Q50 104 52 92 Z" fill={f('lower_back')} {...stroke} />

      {/* Glutes — twin rounded bulges */}
      <path d="M44 118 Q52 116 60 120 Q60 138 50 142 Q42 138 42 128 Z" fill={f('glutes')} {...stroke} />
      <path d="M76 118 Q68 116 60 120 Q60 138 70 142 Q78 138 78 128 Z" fill={f('glutes')} {...stroke} />

      {/* Hamstrings */}
      <path d="M42 144 Q40 168 44 188 L52 188 Q54 166 52 144 Z" fill={f('hamstrings')} {...stroke} />
      <path d="M78 144 Q80 168 76 188 L68 188 Q66 166 68 144 Z" fill={f('hamstrings')} {...stroke} />

      {/* Knees (decorative back-of-knee) */}
      <ellipse cx="47" cy="194" rx="5" ry="3" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />
      <ellipse cx="73" cy="194" rx="5" ry="3" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />

      {/* Calves — gastrocnemius diamond */}
      <path d="M42 200 Q40 214 44 228 L52 228 Q53 214 51 200 Z" fill={f('calves')} {...stroke} />
      <path d="M78 200 Q80 214 76 228 L68 228 Q67 214 69 200 Z" fill={f('calves')} {...stroke} />
    </svg>
  )
}

export function MuscleMapModal({ open, onClose, exerciseName, bodyAnalysis }: MuscleMapModalProps) {
  const [ai, setAi] = useState<ExerciseInfoResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Lock background scroll while the modal is open — fixes scroll bubbling
    // through the modal on touch devices.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  // Fetch AI-enhanced info once per open. Static fallback shows instantly underneath.
  useEffect(() => {
    if (!open || !exerciseName) return
    let cancelled = false
    setAi(null)
    setLoading(true)
    csrfFetch('/api/exercise-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseName }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as ExerciseInfoResponse
      })
      .then((data) => {
        if (!cancelled) setAi(data)
      })
      .catch(() => {
        // silent — static info still displays
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, exerciseName])

  // Use AI info if available, otherwise static fallback. Diagram + chips always render.
  const staticInfo = getExerciseMuscleInfo(exerciseName)
  const primary = ai?.primary ?? staticInfo.primary
  const secondary = ai?.secondary ?? staticInfo.secondary
  const region = ai?.region ?? staticInfo.region
  const benefits = ai?.benefits ?? staticInfo.benefits
  const matched = ai?.matchedFocusAreas ?? matchFocusAreas(staticInfo, bodyAnalysis?.focus_areas)
  const personalNote = ai?.personalNote
  const hasAnyMuscles = primary.length > 0 || secondary.length > 0

  if (!mounted) return null

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass w-full sm:max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl border border-primary/20 p-5"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <div className="text-xs uppercase tracking-wide text-primary-light/80 font-semibold flex items-center gap-2">
                  <span>Muscles &amp; Benefits</span>
                  {loading && <Loader2 className="w-3 h-3 animate-spin text-primary-light/70" />}
                </div>
                <h3 className="text-lg font-bold text-white font-display mt-0.5">{exerciseName}</h3>
                <div className="text-xs text-muted mt-0.5">
                  Region: <span className="text-slate-100">{regionLabel(region)}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4 text-slate-100" />
              </button>
            </div>

            {/* Body diagrams */}
            {hasAnyMuscles ? (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="glass-soft rounded-2xl p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted text-center mb-1">Front</div>
                  <div className="h-56">
                    <BodySvg primary={primary} secondary={secondary} side="front" />
                  </div>
                </div>
                <div className="glass-soft rounded-2xl p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted text-center mb-1">Back</div>
                  <div className="h-56">
                    <BodySvg primary={primary} secondary={secondary} side="back" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-soft rounded-2xl p-4 mt-4 text-sm text-muted text-center">
                We don&apos;t have a muscle map for this exercise yet, but it&apos;s a useful addition to your routine.
              </div>
            )}

            {/* Legend */}
            {hasAnyMuscles && (
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: PRIMARY_FILL }} />
                  Primary
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: SECONDARY_FILL }} />
                  Secondary
                </span>
              </div>
            )}

            {/* Muscle chips */}
            {hasAnyMuscles && (
              <div className="mt-4 space-y-2">
                {primary.length > 0 && (
                  <div>
                    <div className="text-xs text-muted mb-1.5">Primary muscles</div>
                    <div className="flex flex-wrap gap-1.5">
                      {primary.map((m) => (
                        <span
                          key={m}
                          className="text-xs px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary-light"
                        >
                          {muscleLabel(m)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {secondary.length > 0 && (
                  <div>
                    <div className="text-xs text-muted mb-1.5">Secondary muscles</div>
                    <div className="flex flex-wrap gap-1.5">
                      {secondary.map((m) => (
                        <span
                          key={m}
                          className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200"
                        >
                          {muscleLabel(m)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Benefits */}
            {benefits.length > 0 && (
              <div className="mt-5">
                <div className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-primary-light" />
                  Benefits
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-200/85">
                  {benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Personalized note (AI) + matched focus areas */}
            {(personalNote || matched.length > 0) && (
              <div className="mt-5 rounded-2xl p-3.5 border border-emerald-400/25 bg-emerald-400/8">
                <div className="text-sm font-semibold text-emerald-200 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  For your body
                </div>
                {personalNote && (
                  <p className="text-sm text-emerald-50/90 mb-2 leading-relaxed">{personalNote}</p>
                )}
                {matched.length > 0 && (
                  <>
                    <div className="text-xs text-emerald-100/85 mb-2">Targets your focus areas:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {matched.map((m, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-100"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {!bodyAnalysis && (
              <div className="mt-5 text-xs text-muted">
                Upload body photos in the Body tab to see how this exercise matches your personal focus areas.
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}
