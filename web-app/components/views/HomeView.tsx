'use client'

import { WeeklyRoutine } from '@/types'
import { CircularProgress } from '../CircularProgress'

interface HomeViewProps {
  profile: any
  routine: WeeklyRoutine | null
  exerciseCompletions: Map<string, boolean>
  currentWeekNumber: number
  onNavigateToWorkout: () => void
  onGenerateRoutine: () => void
  onGenerateNextWeek: () => void
  generating: boolean
}

export function HomeView({
  profile,
  routine,
  exerciseCompletions,
  currentWeekNumber,
  onNavigateToWorkout,
  onGenerateRoutine,
  onGenerateNextWeek,
  generating,
}: HomeViewProps) {
  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Get today's workout
  const todayIndex = (new Date().getDay() + 6) % 7 // Mon=0
  const todaysPlan = routine?.days?.[Math.min(todayIndex, (routine.days?.length || 1) - 1)]

  // Calculate progress
  const calculateProgress = () => {
    if (!routine) return { completed: 0, total: 0, percentage: 0 }
    
    let total = 0
    let completed = 0
    
    routine.days.forEach((day, dIdx) => {
      day.exercises.forEach((_, eIdx) => {
        total++
        if (exerciseCompletions.get(`${dIdx}-${eIdx}`)) completed++
      })
    })
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, percentage }
  }

  const progress = calculateProgress()

  return (
    <div className="pb-24 px-4 py-4 space-y-4">
      {/* Greeting Header */}
      <div className="mb-1">
        <h1 className="text-xl font-bold text-white mb-0.5">
          {getGreeting()}, {profile?.username || 'Friend'}
        </h1>
        <p className="text-slate-300/70 text-xs">
          {profile?.goal || 'General fitness'} • {profile?.level || 'Beginner'}
        </p>
      </div>

      {/* Today's Workout Card */}
      {routine && todaysPlan ? (
        <div className="glass rounded-xl p-4 overflow-hidden">
          <div className="mb-3">
            <p className="text-xs text-slate-300/70 mb-0.5">Today's Workout</p>
            <h2 className="text-lg font-bold text-white mb-0.5">
              {todaysPlan.day}
            </h2>
            <p className="text-xs text-slate-300/60">
              ⏱️ {todaysPlan.exercises?.length || 0} exercises • Est. 45–60 min
            </p>
          </div>
          
          <button
            onClick={onNavigateToWorkout}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2"
          >
            <span>Start Workout</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-slate-300/70 text-sm mb-3">No routine generated yet</p>
          <button
            onClick={onGenerateRoutine}
            disabled={generating}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Your First Routine'}
          </button>
        </div>
      )}

      {/* Weekly Progress */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Weekly Progress</h3>
        <div className="flex flex-col items-center">
          <CircularProgress 
            percentage={progress.percentage}
            size={100}
            strokeWidth={6}
            label={`${progress.completed}/${progress.total} exercises completed`}
          />
        </div>
      </div>

      {/* Action Buttons */}
      {routine && (
        <div className="space-y-2">
          {/* Next Week Button - shown when 80%+ complete */}
          {progress.percentage >= 80 && (
            <button
              onClick={onGenerateNextWeek}
              disabled={generating}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Regenerate Current Week</span>
          </button>
        </div>
      )}

      {/* Week Info */}
      {routine && (
        <div className="text-center text-xs text-slate-400">
          Week {currentWeekNumber} • {routine.days?.length || 0} day routine
        </div>
      )}
    </div>
  )
}
