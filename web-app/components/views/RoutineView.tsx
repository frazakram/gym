'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, ChevronRight, Sprout, Timer } from 'lucide-react'
import { WeeklyRoutine, WeeklyDiet } from '@/types'
import { DaySelector } from '../DaySelector'
import { DietDisplay } from '@/components/DietDisplay'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { AnimatedButton } from '../ui/AnimatedButton'
import { Collapsible } from '../ui/Collapsible'
import { parseSetsReps } from '@/lib/setsReps'
import { ExerciseListSkeleton } from '../ui/SkeletonLoader'
import { RestDayCard } from '../ui/RestDayCard'

// Map workout day titles to visual accent colors
function getDayTypeColors(dayName: string): { pill: string; border: string } {
  const n = dayName.toLowerCase()
  if (n.includes('push'))       return { pill: 'bg-primary/15 border-primary/30 text-primary-lighter', border: 'border-primary/25' }
  if (n.includes('pull'))       return { pill: 'bg-brand-cyan/12 border-brand-cyan/30 text-brand-cyan-light', border: 'border-brand-cyan/20' }
  if (n.includes('leg'))        return { pill: 'bg-emerald-500/12 border-emerald-500/25 text-emerald-300', border: 'border-emerald-500/15' }
  if (n.includes('full') || n.includes('total')) return { pill: 'bg-amber-400/12 border-amber-400/25 text-amber-300', border: 'border-amber-400/15' }
  if (n.includes('rest') || n.includes('recov')) return { pill: 'bg-white/5 border-white/8 text-muted', border: 'border-white/8' }
  if (n.includes('cardio') || n.includes('hiit')) return { pill: 'bg-coral/12 border-coral/25 text-coral-light', border: 'border-coral/15' }
  return { pill: 'bg-primary/10 border-primary/20 text-primary-lighter', border: 'border-primary/15' }
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

interface RoutineViewProps {
  routine: WeeklyRoutine | null
  diet: WeeklyDiet | null
  onNavigateToWorkout: (dayIndex: number) => void
  onGenerateRoutine: () => void
  onGenerateNextWeek: () => void
  completionPercentage: number
  currentWeekNumber: number
  generating: boolean
  generationStage?: string
  viewingHistory?: boolean
  dayCompletions?: Map<number, boolean>
  onToggleDayComplete?: (dayIndex: number, completed: boolean) => void
  routineIsStale?: boolean
  weeksElapsed?: number
  onStartNewWeek?: () => void
}

export function RoutineView({
  routine,
  diet,
  onNavigateToWorkout,
  onGenerateRoutine,
  onGenerateNextWeek,
  completionPercentage,
  currentWeekNumber,
  generating,
  generationStage = '',
  viewingHistory = false,
  dayCompletions,
  onToggleDayComplete,
  routineIsStale = false,
  weeksElapsed = 0,
  onStartNewWeek,
}: RoutineViewProps) {
  const todayIndex = (new Date().getDay() + 6) % 7 // Mon=0
  const [selectedDay, setSelectedDay] = useState(todayIndex)
  const [manageOpen, setManageOpen] = useState(false)
  const [nutritionOpen, setNutritionOpen] = useState(false)

  if (!routine) {
    return (
      <div className="pb-24 px-4 py-6">
        <div className="glass rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3 font-display">No Routine Yet</h2>
          <p className="text-muted mb-6">Generate your personalized workout routine to get started</p>
          <button
            onClick={onGenerateRoutine}
            disabled={generating}
            className="py-3 px-8 rounded-xl btn-primary text-white font-semibold disabled:opacity-50 ui-focus-ring"
          >
            {generating ? (generationStage || 'Generating...') : 'Generate Routine'}
          </button>
        </div>
      </div>
    )
  }

  const currentDay = routine.days[Math.min(selectedDay, routine.days.length - 1)]
  const isRestDay = !currentDay?.exercises?.length || currentDay.day.toLowerCase().includes('rest')
  const isCompleted = dayCompletions?.get(selectedDay) || false
  
  // Estimate time based on exercise count (rough estimate)
  const estimatedMinutes = currentDay?.exercises?.length ? currentDay.exercises.length * 9 + 12 : 0

  return (
    <div className="pb-24">
      <motion.div variants={stagger} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeUp} className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[18px] font-semibold tracking-tight text-white mb-0.5 font-display">
            {currentDay?.day || 'Select a Day'}
          </h1>
          {currentDay?.day && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getDayTypeColors(currentDay.day).pill}`}>
              {isRestDay ? 'Rest' : currentDay.day.split(' ').slice(-1)[0]}
            </span>
          )}
        </div>
        <p className="text-xs text-muted">
          {isRestDay ? 'Rest & Recovery' : `${currentDay?.exercises?.length || 0} exercises · est. ${estimatedMinutes} min`}
        </p>
      </motion.div>

      {/* Day Selector */}
      <motion.div variants={fadeUp}>
        <DaySelector
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          daysInRoutine={routine.days.length}
        />
      </motion.div>

      {/* Workout card */}
      <motion.div variants={fadeUp} className="px-4 pt-4">
        <GlassCard className="p-4">
          <SectionHeader
            title={isRestDay ? "Rest Day" : "Workout"}
            subtitle={isRestDay ? "Take time to recover" : "Everything you need in one flow"}
            right={
              !isRestDay ? (
                <div className="text-xs text-slate-200/80 glass-soft px-2.5 py-1 rounded-full border border-primary/10 flex items-center gap-1">
                  <Timer className="w-3 h-3" /> {estimatedMinutes} min
                </div>
              ) : null
            }
          />

          <div className="mt-3 space-y-2">
            {generating ? (
              <ExerciseListSkeleton count={5} />
            ) : isRestDay ? (
              <div className="py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <Sprout className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm max-w-[240px] mx-auto">
                  Active recovery, stretching, or light walking is recommended today.
                </p>
              </div>
            ) : (
              currentDay?.exercises?.map((exercise, index) => {
                const meta = parseSetsReps(exercise.sets_reps)
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 bg-white/5 border border-primary/10 rounded-2xl px-3 py-3 hover:bg-white/8 transition-colors"
                  >
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-semibold text-primary-lighter">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white/90 truncate">{exercise.name}</p>
                      <p className="mt-0.5 text-xs text-muted truncate">{exercise.sets_reps}</p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1 text-xs text-slate-200/80">
                      <div className="flex items-center gap-1.5">
                        {typeof meta.sets === 'number' ? (
                          <span className="inline-flex items-center rounded-full bg-white/5 border border-primary/10 px-2 py-0.5">
                            {meta.sets} sets
                          </span>
                        ) : null}
                        {typeof meta.reps === 'number' ? (
                          <span className="inline-flex items-center rounded-full bg-white/5 border border-primary/10 px-2 py-0.5">
                            {meta.reps} reps
                          </span>
                        ) : null}
                      </div>
                      {typeof meta.restSeconds === 'number' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 text-emerald-100">
                          Rest {meta.restSeconds}s
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-4">
            {isRestDay ? (
              !viewingHistory && onToggleDayComplete ? (
                <AnimatedButton
                  onClick={() => onToggleDayComplete(selectedDay, !isCompleted)}
                  variant={isCompleted ? "ghost" : "primary"}
                  fullWidth
                  icon={isCompleted ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                >
                  {isCompleted ? 'Completed' : 'Mark as Complete'}
                </AnimatedButton>
              ) : null
            ) : (
              <AnimatedButton
                onClick={() => onNavigateToWorkout(selectedDay)}
                variant="primary"
                fullWidth
                icon={
                  <ArrowRight className="w-4 h-4" />
                }
              >
                Start workout
              </AnimatedButton>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Rest Day Recovery Content */}
      {routine && isRestDay && (
        <motion.div variants={fadeUp} className="px-4 pt-3">
          <RestDayCard />
        </motion.div>
      )}

      {/* Action Buttons */}
      {!viewingHistory && (
        <motion.div variants={fadeUp} className="px-4 pt-3">
          <GlassCard className="p-4">
            <Collapsible
              open={manageOpen}
              onToggle={() => setManageOpen(v => !v)}
              header={
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-sm font-semibold text-white">Manage plan</p>
                    <p className="text-xs text-muted">
                      You&apos;ve completed {completionPercentage}% this week
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              }
            >
              <div className="space-y-2">
                {routineIsStale && onStartNewWeek ? (
                  <AnimatedButton
                    onClick={onStartNewWeek}
                    disabled={generating}
                    loading={generating}
                    variant="primary"
                    fullWidth
                  >
                    {generating ? 'Generating...' : `Start Week ${currentWeekNumber + weeksElapsed}`}
                  </AnimatedButton>
                ) : completionPercentage >= 80 ? (
                  <AnimatedButton
                    onClick={onGenerateNextWeek}
                    disabled={generating}
                    loading={generating}
                    variant="secondary"
                    fullWidth
                  >
                    {generating ? 'Generating...' : `Generate Week ${currentWeekNumber + 1}`}
                  </AnimatedButton>
                ) : null}

                <AnimatedButton
                  onClick={onGenerateRoutine}
                  disabled={generating}
                  loading={generating}
                  variant="ghost"
                  fullWidth
                >
                  Regenerate this week
                </AnimatedButton>
              </div>
            </Collapsible>
          </GlassCard>
        </motion.div>
      )}

      {/* Nutrition (secondary) */}
      {diet ? (
        <motion.div variants={fadeUp} className="px-4 pt-3 pb-8">
          <GlassCard className="p-4">
            <Collapsible
              open={nutritionOpen}
              onToggle={() => setNutritionOpen(v => !v)}
              header={
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-sm font-semibold text-white">Nutrition plan</p>
                    <p className="text-xs text-muted">Weekly meal plan synced to your routine</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              }
            >
              <DietDisplay diet={diet} />
            </Collapsible>
          </GlassCard>
        </motion.div>
      ) : (
        <div className="px-4 pb-8" />
      )}

      </motion.div>
    </div>
  )
}
