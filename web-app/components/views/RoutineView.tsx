'use client'

import { useState } from 'react'
import { WeeklyRoutine, WeeklyDiet } from '@/types'
import { DaySelector } from '../DaySelector'
import { DietDisplay } from '@/components/DietDisplay'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { AnimatedButton } from '../ui/AnimatedButton'
import { Collapsible } from '../ui/Collapsible'
import { parseSetsReps } from '@/lib/setsReps'
import { ExerciseListSkeleton } from '../ui/SkeletonLoader'

interface RoutineViewProps {
  routine: WeeklyRoutine | null
  diet: WeeklyDiet | null
  onNavigateToWorkout: (dayIndex: number) => void
  onGenerateRoutine: () => void
  onGenerateNextWeek: () => void
  completionPercentage: number
  currentWeekNumber: number
  generating: boolean
  viewingHistory?: boolean
  dayCompletions?: Map<number, boolean>
  onToggleDayComplete?: (dayIndex: number, completed: boolean) => void
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
  viewingHistory = false,
  dayCompletions,
  onToggleDayComplete,
}: RoutineViewProps) {
  const todayIndex = (new Date().getDay() + 6) % 7 // Mon=0
  const [selectedDay, setSelectedDay] = useState(todayIndex)
  const [manageOpen, setManageOpen] = useState(false)
  const [nutritionOpen, setNutritionOpen] = useState(false)

  if (!routine) {
    return (
      <div className="pb-24 px-4 py-6">
        <div className="glass rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">No Routine Yet</h2>
          <p className="text-slate-300/70 mb-6">Generate your personalized workout routine to get started</p>
          <button
            onClick={onGenerateRoutine}
            disabled={generating}
            className="py-3 px-8 rounded-xl btn-primary text-white font-semibold disabled:opacity-50 ui-focus-ring"
          >
            {generating ? 'Generating...' : 'Generate Routine'}
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
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-[18px] font-semibold tracking-tight text-white mb-0.5">
          {currentDay?.day || 'Select a Day'}
        </h1>
        <p className="text-xs text-slate-300/70">
          {isRestDay ? 'Rest & Recovery' : `${currentDay?.exercises?.length || 0} exercises`}
        </p>
      </div>

      {/* Day Selector */}
      <DaySelector
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
        daysInRoutine={routine.days.length}
      />

      {/* Workout card */}
      <div className="px-4 pt-4">
        <GlassCard className="p-4">
          <SectionHeader
            title={isRestDay ? "Rest Day" : "Workout"}
            subtitle={isRestDay ? "Take time to recover" : "Everything you need in one flow"}
            right={
              !isRestDay ? (
                <div className="text-[11px] text-slate-200/80 glass-soft px-2.5 py-1 rounded-full border border-white/10">
                  ⏱️ {estimatedMinutes} min
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
                  <span className="text-2xl">🌱</span>
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
                    className="flex items-start justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">{exercise.name}</p>
                      <p className="mt-0.5 text-xs text-slate-300/70 truncate">{exercise.sets_reps}</p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1 text-[11px] text-slate-200/80">
                      <div className="flex items-center gap-1.5">
                        {typeof meta.sets === 'number' ? (
                          <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2 py-0.5">
                            {meta.sets} sets
                          </span>
                        ) : null}
                        {typeof meta.reps === 'number' ? (
                          <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2 py-0.5">
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
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                }
              >
                Start workout
              </AnimatedButton>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Action Buttons */}
      {!viewingHistory && (
        <div className="px-4 pt-3">
          <GlassCard className="p-4">
            <Collapsible
              open={manageOpen}
              onToggle={() => setManageOpen(v => !v)}
              header={
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-sm font-semibold text-white">Manage plan</p>
                    <p className="text-xs text-slate-300/70">
                      You&apos;ve completed {completionPercentage}% this week
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              }
            >
              <div className="space-y-2">
                {completionPercentage >= 80 ? (
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
        </div>
      )}

      {/* Nutrition (secondary) */}
      {diet ? (
        <div className="px-4 pt-3 pb-8">
          <GlassCard className="p-4">
            <Collapsible
              open={nutritionOpen}
              onToggle={() => setNutritionOpen(v => !v)}
              header={
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-sm font-semibold text-white">Nutrition plan</p>
                    <p className="text-xs text-slate-300/70">Weekly meal plan synced to your routine</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              }
            >
              <DietDisplay diet={diet} />
            </Collapsible>
          </GlassCard>
        </div>
      ) : (
        <div className="px-4 pb-8" />
      )}

    </div>
  )
}
