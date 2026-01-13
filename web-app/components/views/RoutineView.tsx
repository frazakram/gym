'use client'

import { useState } from 'react'
import { WeeklyRoutine, WeeklyDiet } from '@/types'
import { DaySelector } from '../DaySelector'
import { DietDisplay } from '@/components/DietDisplay'

interface RoutineViewProps {
  routine: WeeklyRoutine | null
  diet: WeeklyDiet | null // Added diet prop
  onNavigateToWorkout: (dayIndex: number) => void
  onGenerateRoutine: () => void
  onGenerateNextWeek: () => void
  completionPercentage: number
  currentWeekNumber: number
  generating: boolean
  viewingHistory?: boolean
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
}: RoutineViewProps) {
  const todayIndex = (new Date().getDay() + 6) % 7 // Mon=0
  const [selectedDay, setSelectedDay] = useState(todayIndex)

  if (!routine) {
    return (
      <div className="pb-24 px-4 py-6">
        <div className="glass rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">No Routine Yet</h2>
          <p className="text-slate-300/70 mb-6">Generate your personalized workout routine to get started</p>
          <button
            onClick={onGenerateRoutine}
            disabled={generating}
            className="py-3 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Routine'}
          </button>
        </div>
      </div>
    )
  }

  const currentDay = routine.days[Math.min(selectedDay, routine.days.length - 1)]
  
  // Estimate time based on exercise count (rough estimate)
  const estimatedMinutes = currentDay?.exercises?.length ? currentDay.exercises.length * 10 : 45

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-white mb-0.5">
          {currentDay?.day || 'Select a Day'}
        </h1>
        <p className="text-xs text-slate-300/70">
          {currentDay?.exercises?.length || 0} Exercises
        </p>
      </div>

      {/* Day Selector */}
      <DaySelector
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
        daysInRoutine={routine.days.length}
      />

      {/* Exercise List */}
      <div className="px-4 pt-4 space-y-3">
        {currentDay?.exercises?.map((exercise, index) => (
          <button
            key={index}
            onClick={() => {
              setSelectedDay(selectedDay)
              onNavigateToWorkout(selectedDay)
            }}
            className="w-full glass-soft rounded-xl p-4 hover:bg-white/10 transition-all text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Exercise Icon/Emoji */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center text-2xl flex-shrink-0">
                💪
              </div>
              
              {/* Exercise Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-1 truncate">
                  {exercise.name}
                </h3>
                <p className="text-sm text-slate-300/60 truncate">
                  {exercise.sets_reps}
                </p>
              </div>
            </div>

            {/* Chevron */}
            <svg 
              className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition flex-shrink-0" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {/* Estimated Time */}
      <div className="px-4 pt-4">
        <div className="glass-soft rounded-lg p-3 text-center">
          <p className="text-xs text-slate-300/70">Estimated Time</p>
          <p className="text-lg font-bold text-white mt-0.5">{estimatedMinutes} min</p>
        </div>
      </div>

      {/* Action Buttons */}
      {!viewingHistory && (
        <div className="px-4 pt-3 space-y-2">
        {/* Ready for Next Week indicator */}
        {completionPercentage >= 80 && (
          <div className="glass-soft rounded-lg p-3 mb-2 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-300 mb-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold">Great Progress!</span>
            </div>
            <p className="text-xs text-slate-300/70">You've completed {completionPercentage}% of this week. Ready to advance?</p>
          </div>
        )}

        {/* Next Week Button */}
        {completionPercentage >= 80 && (
          <button
            onClick={onGenerateNextWeek}
            disabled={generating}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span>{generating ? 'Generating...' : `Generate Week ${currentWeekNumber + 1}`}</span>
          </button>
        )}
        
        {/* Regenerate Current Week */}
        <button
          onClick={onGenerateRoutine}
          disabled={generating}
          className="w-full py-2.5 px-4 rounded-lg glass-soft text-slate-100 hover:text-white hover:bg-white/10 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Regenerate This Week</span>
        </button>
      </div>
      )}

      {/* Diet Display */}
      <div className="px-4 pb-8">
         <DietDisplay diet={diet} />
      </div>

    </div>
  )
}
