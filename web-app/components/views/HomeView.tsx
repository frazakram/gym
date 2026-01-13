'use client'

import { WeeklyRoutine, WeeklyDiet } from '@/types'
import { CircularProgress } from '../CircularProgress'
import { NoRoutineEmptyState } from '../ui/EmptyState'
import { AnimatedButton } from '../ui/AnimatedButton'

interface HomeViewProps {
  profile: any
  routine: WeeklyRoutine | null
  diet: WeeklyDiet | null
  exerciseCompletions: Map<string, boolean>
  currentWeekNumber: number
  onNavigateToWorkout: () => void
  onGenerateRoutine: () => void
  onGenerateNextWeek: () => void
  generating: boolean
  viewingHistory?: boolean
}

export function HomeView({
  profile,
  routine,
  diet,
  exerciseCompletions,
  currentWeekNumber,
  onNavigateToWorkout,
  onGenerateRoutine,
  onGenerateNextWeek,
  generating,
  viewingHistory = false,
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
  
  // Get today's diet
  const todaysDiet = diet?.days?.[Math.min(todayIndex, (diet.days?.length || 1) - 1)]

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
    <div className="pb-24 px-4 py-4 space-y-4 view-transition">
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
          
          <AnimatedButton
            onClick={onNavigateToWorkout}
            variant="primary"
            fullWidth
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            }
          >
            Start Workout
          </AnimatedButton>
        </div>
      ) : (
        <NoRoutineEmptyState onGenerate={onGenerateRoutine} />
      )}

      {/* Today's Diet Card */}
      {diet && todaysDiet && (
        <div className="glass rounded-xl p-4 overflow-hidden">
          <div className="mb-3">
            <p className="text-xs text-slate-300/70 mb-0.5">Today's Nutrition</p>
            <h2 className="text-lg font-bold text-white mb-0.5">
              {todaysDiet.day}
            </h2>
            <div className="flex gap-4 text-xs text-slate-300/60 mt-1">
               <span className="flex items-center gap-1">Protocol: {profile?.diet_type || 'Standard'}</span>
               <span className="flex items-center gap-1">🔥 {todaysDiet.total_calories} kcal</span>
               <span className="flex items-center gap-1">🥩 {todaysDiet.total_protein}g Protein</span>
            </div>
          </div>
          
          <div className="space-y-2 mb-3">
             {todaysDiet.meals.slice(0, 2).map((meal, i) => (
                <div key={i} className="flex justify-between text-sm text-white/80 bg-white/5 p-2 rounded">
                   <span className="truncate flex-1">{meal.name}</span>
                   <span className="text-white/50 text-xs ml-2">{meal.calories} kcal</span>
                </div>
             ))}
             {todaysDiet.meals.length > 2 && (
                <div className="text-xs text-center text-white/40">
                   + {todaysDiet.meals.length - 2} more meals
                </div>
             )}
          </div>
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
      {routine && !viewingHistory && (
        <div className="space-y-2">
          {/* Next Week Button - shown when 80%+ complete */}
          {progress.percentage >= 80 && (
            <AnimatedButton
              onClick={onGenerateNextWeek}
              disabled={generating}
              loading={generating}
              variant="secondary"
              fullWidth
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              }
            >
              {generating ? 'Generating...' : `Generate Week ${currentWeekNumber + 1}`}
            </AnimatedButton>
          )}
          
          {/* Regenerate Current Week */}
          <AnimatedButton
            onClick={onGenerateRoutine}
            disabled={generating}
            loading={generating}
            variant="ghost"
            fullWidth
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            Regenerate Current Week
          </AnimatedButton>
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
