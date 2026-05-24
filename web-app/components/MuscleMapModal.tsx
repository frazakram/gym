'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Target, Loader2 } from 'lucide-react'
import { csrfFetch } from '@/lib/useCsrf'
import { BodySvgShared } from './BodySvgShared'
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

const PRIMARY_FILL = 'rgba(0, 229, 188, 0.92)'
const SECONDARY_FILL = 'rgba(0, 229, 188, 0.42)'
const BASE_FILL = 'rgba(122, 148, 144, 0.18)'
const BASE_STROKE = 'rgba(122, 148, 144, 0.45)'
const SILHOUETTE_FILL = 'rgba(122, 148, 144, 0.08)'

function fillFor(muscle: MuscleGroup, primary: MuscleGroup[], secondary: MuscleGroup[]) {
  if (primary.includes(muscle)) return PRIMARY_FILL
  if (secondary.includes(muscle)) return SECONDARY_FILL
  return BASE_FILL
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
                    <BodySvgShared fillFor={(m) => fillFor(m, primary, secondary)} side="front" />
                  </div>
                </div>
                <div className="glass-soft rounded-2xl p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted text-center mb-1">Back</div>
                  <div className="h-56">
                    <BodySvgShared fillFor={(m) => fillFor(m, primary, secondary)} side="back" />
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
