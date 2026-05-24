'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Ruler, AlertCircle, CheckCircle, Sparkles, RefreshCw } from 'lucide-react'
import type { BodyPhoto, BodyCompositionAnalysis } from '@/types'
import { GlassCard } from '../ui/GlassCard'
import { ImageUploadCard } from '../ui/ImageUploadCard'
import { MeasurementsView } from './MeasurementsView'

interface BodyViewProps {
  bodyPhotos: BodyPhoto[]
  bodyAnalysis: BodyCompositionAnalysis | null
  analyzingBody: boolean
  bodyError: string
  onBodyPhotoUpload: (files: File[]) => Promise<void>
  onBodyPhotoDelete: (id: string) => void
  onBodyPhotoClearAll?: () => Promise<void>
}

type Tab = 'composition' | 'measurements'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

function weeksSince(iso: string | undefined | null): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const ms = Date.now() - then
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 7))
}

export function BodyView({
  bodyPhotos,
  bodyAnalysis,
  analyzingBody,
  bodyError,
  onBodyPhotoUpload,
  onBodyPhotoDelete,
  onBodyPhotoClearAll,
}: BodyViewProps) {
  const [tab, setTab] = useState<Tab>('composition')

  // Find most recent photo upload date for the weekly re-upload nudge
  const latestUploadIso = useMemo(() => {
    if (!bodyPhotos || bodyPhotos.length === 0) return null
    const sorted = [...bodyPhotos].sort((a, b) =>
      (b.uploaded_at ?? '').localeCompare(a.uploaded_at ?? '')
    )
    return sorted[0]?.uploaded_at ?? null
  }, [bodyPhotos])

  const weeks = weeksSince(latestUploadIso)
  const showReuploadPrompt = bodyPhotos.length > 0 && weeks != null && weeks >= 1

  return (
    <div className="pb-24 px-4 py-6">
      <h1 className="text-2xl font-bold text-white font-display mb-1">Body</h1>
      <p className="text-xs text-muted mb-4">
        Track your body composition and measurements over time
      </p>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl glass-soft border border-primary/10 mb-4">
        <TabButton active={tab === 'composition'} onClick={() => setTab('composition')} icon={Camera} label="Composition" />
        <TabButton active={tab === 'measurements'} onClick={() => setTab('measurements')} icon={Ruler} label="Measurements" />
      </div>

      {tab === 'composition' ? (
        <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="visible">
          {/* Weekly re-upload nudge — only when user has photos AND >=1 week old */}
          {showReuploadPrompt && (
            <motion.div variants={fadeUp}>
              <div className="rounded-2xl p-4 border border-amber-400/25 bg-amber-400/5 flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-100">
                    Time for a progress update?
                  </p>
                  <p className="text-xs text-amber-200/85 mt-0.5">
                    Your last body photo was {weeks === 1 ? '1 week' : `${weeks} weeks`} ago. Re-upload weekly to track your progress and keep AI recommendations accurate. (Optional)
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Upload card */}
          <motion.div variants={fadeUp}>
            <GlassCard className="p-4">
              <div className="flex items-start gap-2 mb-3">
                <Camera className="w-4 h-4 text-primary-light mt-0.5" />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-white">Body Photos</h2>
                  <p className="text-xs text-muted mt-0.5">
                    Upload 1–2 body photos. AI analyzes body composition to personalize your routine. Photos are encrypted and never shared.
                  </p>
                </div>
              </div>

              <ImageUploadCard
                images={bodyPhotos}
                maxImages={2}
                maxSizeMB={5}
                onUpload={onBodyPhotoUpload}
                onDelete={onBodyPhotoDelete}
                onClearAll={onBodyPhotoClearAll}
                loading={analyzingBody}
                error={bodyError}
                variant="body"
              />
            </GlassCard>
          </motion.div>

          {/* Analysis results */}
          {bodyAnalysis && (
            <motion.div variants={fadeUp}>
              <GlassCard className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <h2 className="text-sm font-semibold text-white">Analysis</h2>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat label="Body type" value={bodyAnalysis.body_type} />
                  <Stat label="Muscle development" value={bodyAnalysis.muscle_development} />
                  {bodyAnalysis.estimated_body_fat_range && (
                    <Stat label="Est. body fat" value={bodyAnalysis.estimated_body_fat_range} colSpan />
                  )}
                </div>

                {bodyAnalysis.focus_areas && bodyAnalysis.focus_areas.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-1.5">Focus areas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {bodyAnalysis.focus_areas.map((area, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary-light"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {bodyAnalysis.posture_notes && bodyAnalysis.posture_notes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-1.5">Posture notes</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs text-slate-200/85">
                      {bodyAnalysis.posture_notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {bodyAnalysis.realistic_timeline && (
                  <p className="text-xs text-emerald-200/90 flex items-start gap-1.5">
                    <span>🎯</span>
                    <span>{bodyAnalysis.realistic_timeline}</span>
                  </p>
                )}

                {bodyAnalysis.overall_assessment && (
                  <p className="text-xs text-slate-200/80 leading-relaxed pt-1 border-t border-white/5">
                    {bodyAnalysis.overall_assessment}
                  </p>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* Empty-state hint when no photos yet */}
          {!bodyAnalysis && bodyPhotos.length === 0 && (
            <motion.div variants={fadeUp}>
              <div className="rounded-2xl p-4 border border-primary/15 bg-primary/5 text-xs text-slate-200/85 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-primary-light mt-0.5 shrink-0" />
                <div>
                  Once you upload body photos, your routine will adapt to your body type, muscle development and focus areas — and your exercises will show a personalized &ldquo;For your body&rdquo; note in Muscles &amp; Benefits.
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <MeasurementsView />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
        active
          ? 'bg-primary/20 text-primary-light border border-primary/30'
          : 'text-muted hover:text-white border border-transparent'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

function Stat({ label, value, colSpan }: { label: string; value: string | undefined | null; colSpan?: boolean }) {
  if (!value) return null
  return (
    <div className={`glass-soft rounded-lg px-3 py-2 ${colSpan ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm text-white capitalize mt-0.5">{value}</p>
    </div>
  )
}
