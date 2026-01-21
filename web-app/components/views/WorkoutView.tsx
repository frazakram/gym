'use client'

import { WeeklyRoutine } from '@/types'
import { ExerciseCard } from '../ExerciseCard'
import { SwipeableExerciseWrapper } from '../ui/SwipeableExercise'

interface WorkoutViewProps {
  routine: WeeklyRoutine | null
  selectedDayIndex: number
  currentRoutineId: number | null
  exerciseCompletions: Map<string, boolean>
  dayCompletions: Map<number, boolean>
  onToggleExercise: (dayIndex: number, exerciseIndex: number, completed: boolean) => void
  onToggleRestDay: (dayIndex: number, completed: boolean) => Promise<void>
  onEnsureRoutineSaved: () => Promise<number | null>
  onBack: () => void
}

export function WorkoutView({
  routine,
  selectedDayIndex,
  currentRoutineId,
  exerciseCompletions,
  dayCompletions,
  onToggleExercise,
  onToggleRestDay,
  onEnsureRoutineSaved,
  onBack,
}: WorkoutViewProps) {
  if (!routine) {
    return (
      <div className="pb-24 px-4 py-6">
        <div className="glass rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">No Workout Selected</h2>
          <p className="text-slate-300/70">Go to Routine to select a workout</p>
        </div>
      </div>
    )
  }

  const day = routine.days[Math.min(selectedDayIndex, routine.days.length - 1)]

  if (!day) {
    return (
      <div className="pb-24 px-4 py-6">
        <div className="glass rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Day Not Found</h2>
          <p className="text-slate-300/70">Please select a valid day from the routine</p>
        </div>
      </div>
    )
  }

  // Calculate progress for this day
  const completedCount = day.exercises.filter((_, eIdx) =>
    exerciseCompletions.get(`${selectedDayIndex}-${eIdx}`)
  ).length
  const totalCount = day.exercises.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isRestDay = totalCount === 0
  const restDone = Boolean(dayCompletions.get(selectedDayIndex))

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-menu backdrop-blur-xl px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg glass-soft hover:bg-white/10 transition"
            aria-label="Go back"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">{day.day}</h1>
            <p className="text-xs text-slate-300/70">
              {isRestDay ? (restDone ? 'Rest day completed' : 'Rest day') : `${completedCount}/${totalCount} completed • ${progressPercentage}%`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-teal-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${isRestDay ? (restDone ? 100 : 0) : progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="px-4 pt-4 space-y-4">
        {isRestDay ? (
          <div className="glass rounded-2xl p-5 border border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-white">Rest day</div>
                <div className="text-xs text-slate-300/70 mt-1">
                  Take recovery seriously. You can still mark today as complete.
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200/10 text-slate-200 border border-white/10">
                Recovery
              </span>
            </div>

            <div className="mt-4">
              <button
                onClick={async () => {
                  // Ensure routine is saved before we can persist rest-day completion
                  if (!currentRoutineId) {
                    const rid = await onEnsureRoutineSaved()
                    if (!rid) return
                  }
                  await onToggleRestDay(selectedDayIndex, !restDone)
                }}
                className={`w-full px-5 py-3 rounded-2xl font-semibold text-sm transition border ${restDone
                    ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-100 hover:bg-emerald-400/15'
                    : 'bg-white/5 border-white/10 text-white/90 hover:bg-white/10'
                  }`}
              >
                {restDone ? '✓ Marked complete' : 'Mark rest day complete'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {day.exercises.map((exercise, exerciseIndex) => {
              const isCompleted = exerciseCompletions.get(`${selectedDayIndex}-${exerciseIndex}`) || false
              return (
                <SwipeableExerciseWrapper
                  key={exerciseIndex}
                  isCompleted={isCompleted}
                  onComplete={async () => {
                    if (!currentRoutineId) {
                      const rid = await onEnsureRoutineSaved()
                      if (!rid) return
                    }
                    onToggleExercise(selectedDayIndex, exerciseIndex, true)
                  }}
                  onSkip={() => {
                    // Skip just marks as not completed (or could be a separate state)
                    onToggleExercise(selectedDayIndex, exerciseIndex, false)
                  }}
                >
                  <ExerciseCard
                    exercise={exercise}
                    dayIndex={selectedDayIndex}
                    exerciseIndex={exerciseIndex}
                    routineId={currentRoutineId}
                    isCompleted={isCompleted}
                    onToggle={(completed) => onToggleExercise(selectedDayIndex, exerciseIndex, completed)}
                    onEnsureRoutineSaved={onEnsureRoutineSaved}
                  />
                </SwipeableExerciseWrapper>
              )
            })}
          </>
        )}
      </div>

      {/* Completion Message */}
      {completedCount === totalCount && totalCount > 0 && (
        <div className="px-4 pt-4">
          <div className="glass rounded-xl p-4 text-center bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-base font-bold text-white mb-1">Workout Complete!</h3>
            <p className="text-xs text-slate-300/70">Great job finishing today&apos;s workout</p>
          </div>
        </div>
      )}
    </div>
  )
}
