'use client'

import { useEffect, useState } from 'react'
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

const PRIMARY_FILL = 'rgba(96, 165, 250, 0.85)'
const SECONDARY_FILL = 'rgba(96, 165, 250, 0.35)'
const BASE_FILL = 'rgba(148, 163, 184, 0.15)'
const BASE_STROKE = 'rgba(148, 163, 184, 0.35)'

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

function BodySvg({ primary, secondary, side }: BodySvgProps) {
  const f = (m: MuscleGroup) => fillFor(m, primary, secondary)
  const strokeProps = { stroke: BASE_STROKE, strokeWidth: 0.6 }

  if (side === 'front') {
    return (
      <svg viewBox="0 0 120 240" className="w-full h-full" aria-label="Front body diagram">
        {/* Head */}
        <ellipse cx="60" cy="18" rx="11" ry="14" fill={BASE_FILL} {...strokeProps} />
        {/* Neck */}
        <rect x="55" y="30" width="10" height="8" fill={f('neck')} {...strokeProps} />

        {/* Shoulders (deltoids) - left */}
        <ellipse cx="38" cy="46" rx="11" ry="9" fill={f('shoulders')} {...strokeProps} />
        {/* Shoulders - right */}
        <ellipse cx="82" cy="46" rx="11" ry="9" fill={f('shoulders')} {...strokeProps} />

        {/* Chest - left */}
        <path d="M44 44 Q60 48 60 70 Q52 72 44 68 Z" fill={f('chest')} {...strokeProps} />
        {/* Chest - right */}
        <path d="M76 44 Q60 48 60 70 Q68 72 76 68 Z" fill={f('chest')} {...strokeProps} />

        {/* Biceps - left */}
        <ellipse cx="32" cy="68" rx="7" ry="13" fill={f('biceps')} {...strokeProps} />
        {/* Biceps - right */}
        <ellipse cx="88" cy="68" rx="7" ry="13" fill={f('biceps')} {...strokeProps} />

        {/* Forearms - left */}
        <ellipse cx="28" cy="95" rx="6" ry="14" fill={f('forearms')} {...strokeProps} />
        {/* Forearms - right */}
        <ellipse cx="92" cy="95" rx="6" ry="14" fill={f('forearms')} {...strokeProps} />

        {/* Abs */}
        <rect x="50" y="74" width="20" height="32" rx="3" fill={f('abs')} {...strokeProps} />
        {/* Obliques - left */}
        <path d="M44 76 L50 78 L50 104 L44 100 Z" fill={f('obliques')} {...strokeProps} />
        {/* Obliques - right */}
        <path d="M76 76 L70 78 L70 104 L76 100 Z" fill={f('obliques')} {...strokeProps} />

        {/* Adductors / pelvis */}
        <path d="M48 108 L72 108 L68 122 L52 122 Z" fill={f('adductors')} {...strokeProps} />

        {/* Quads - left */}
        <ellipse cx="50" cy="148" rx="10" ry="26" fill={f('quads')} {...strokeProps} />
        {/* Quads - right */}
        <ellipse cx="70" cy="148" rx="10" ry="26" fill={f('quads')} {...strokeProps} />

        {/* Knees - decorative */}
        <ellipse cx="50" cy="178" rx="6" ry="4" fill={BASE_FILL} {...strokeProps} />
        <ellipse cx="70" cy="178" rx="6" ry="4" fill={BASE_FILL} {...strokeProps} />

        {/* Calves - subtle on front (shins) */}
        <ellipse cx="50" cy="208" rx="7" ry="20" fill={BASE_FILL} {...strokeProps} />
        <ellipse cx="70" cy="208" rx="7" ry="20" fill={BASE_FILL} {...strokeProps} />
      </svg>
    )
  }

  // BACK
  return (
    <svg viewBox="0 0 120 240" className="w-full h-full" aria-label="Back body diagram">
      {/* Head */}
      <ellipse cx="60" cy="18" rx="11" ry="14" fill={BASE_FILL} {...strokeProps} />
      {/* Neck */}
      <rect x="55" y="30" width="10" height="8" fill={f('neck')} {...strokeProps} />

      {/* Traps */}
      <path d="M44 38 Q60 32 76 38 L72 56 L48 56 Z" fill={f('traps')} {...strokeProps} />

      {/* Shoulders (rear delts) - left */}
      <ellipse cx="38" cy="46" rx="11" ry="9" fill={f('shoulders')} {...strokeProps} />
      {/* Shoulders - right */}
      <ellipse cx="82" cy="46" rx="11" ry="9" fill={f('shoulders')} {...strokeProps} />

      {/* Upper back */}
      <path d="M46 56 L74 56 L74 78 L46 78 Z" fill={f('upper_back')} {...strokeProps} />

      {/* Lats - left */}
      <path d="M44 60 Q40 78 46 100 L52 96 L52 70 Z" fill={f('lats')} {...strokeProps} />
      {/* Lats - right */}
      <path d="M76 60 Q80 78 74 100 L68 96 L68 70 Z" fill={f('lats')} {...strokeProps} />

      {/* Triceps - left */}
      <ellipse cx="32" cy="68" rx="7" ry="13" fill={f('triceps')} {...strokeProps} />
      {/* Triceps - right */}
      <ellipse cx="88" cy="68" rx="7" ry="13" fill={f('triceps')} {...strokeProps} />

      {/* Forearms - left */}
      <ellipse cx="28" cy="95" rx="6" ry="14" fill={f('forearms')} {...strokeProps} />
      {/* Forearms - right */}
      <ellipse cx="92" cy="95" rx="6" ry="14" fill={f('forearms')} {...strokeProps} />

      {/* Lower back */}
      <rect x="50" y="92" width="20" height="20" rx="2" fill={f('lower_back')} {...strokeProps} />

      {/* Glutes */}
      <path d="M46 114 Q60 120 74 114 L72 138 Q60 142 48 138 Z" fill={f('glutes')} {...strokeProps} />

      {/* Hamstrings - left */}
      <ellipse cx="50" cy="160" rx="10" ry="22" fill={f('hamstrings')} {...strokeProps} />
      {/* Hamstrings - right */}
      <ellipse cx="70" cy="160" rx="10" ry="22" fill={f('hamstrings')} {...strokeProps} />

      {/* Calves - left */}
      <ellipse cx="50" cy="205" rx="7" ry="20" fill={f('calves')} {...strokeProps} />
      {/* Calves - right */}
      <ellipse cx="70" cy="205" rx="7" ry="20" fill={f('calves')} {...strokeProps} />
    </svg>
  )
}

export function MuscleMapModal({ open, onClose, exerciseName, bodyAnalysis }: MuscleMapModalProps) {
  const [ai, setAi] = useState<ExerciseInfoResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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

  return (
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
            className="glass w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-primary/20 p-5"
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

            {bodyAnalysis && !personalNote && !matched.length && hasAnyMuscles && !loading && (
              <div className="mt-5 text-xs text-muted">
                Your body analysis didn&apos;t flag this region as a focus area — it&apos;s still a solid all-rounder.
              </div>
            )}

            {!bodyAnalysis && (
              <div className="mt-5 text-xs text-muted">
                Upload body photos in Measurements to see how this exercise matches your personal focus areas.
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
