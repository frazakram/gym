'use client'

import { WeeklyRoutine } from '@/types'
import { ExerciseCard } from '../ExerciseCard'

interface WorkoutViewProps {
  routine: WeeklyRoutine | null
  selectedDayIndex: number
  currentRoutineId: number | null
  exerciseCompletions: Map<string, boolean>
  onToggleExercise: (dayIndex: number, exerciseIndex: number, completed: boolean) => void
  onEnsureRoutineSaved: () => Promise<number | null>
  onBack: () => void
}

export function WorkoutView({
  routine,
  selectedDayIndex,
  currentRoutineId,
  exerciseCompletions,
  onToggleExercise,
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
              {completedCount}/{totalCount} completed • {progressPercentage}%
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="px-4 pt-4 space-y-4">
        {day.exercises.map((exercise, exerciseIndex) => (
          <ExerciseCard
            key={exerciseIndex}
            exercise={exercise}
            dayIndex={selectedDayIndex}
            exerciseIndex={exerciseIndex}
            routineId={currentRoutineId}
            isCompleted={exerciseCompletions.get(`${selectedDayIndex}-${exerciseIndex}`) || false}
            onToggle={(completed) => onToggleExercise(selectedDayIndex, exerciseIndex, completed)}
            onEnsureRoutineSaved={onEnsureRoutineSaved}
          />
        ))}
      </div>

      {/* Completion Message */}
      {completedCount === totalCount && totalCount > 0 && (
        <div className="px-4 pt-4">
          <div className="glass rounded-xl p-4 text-center bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-base font-bold text-white mb-1">Workout Complete!</h3>
            <p className="text-xs text-slate-300/70">Great job finishing today's workout</p>
          </div>
        </div>
      )}
    </div>
  )
}
