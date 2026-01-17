'use client'

import { useState } from 'react'
import { Profile, WeeklyRoutine, WeeklyDiet } from '@/types'
import { CircularProgress } from '../CircularProgress'
import { NoRoutineEmptyState } from '../ui/EmptyState'
import { AnimatedButton } from '../ui/AnimatedButton'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { Collapsible } from '../ui/Collapsible'
import { ProgressSkeleton, WorkoutCardSkeleton } from '../ui/SkeletonLoader'

interface HomeViewProps {
  profile: (Profile & { username?: string }) | null
  routine: WeeklyRoutine | null
  diet: WeeklyDiet | null
  exerciseCompletions: Map<string, boolean>
  dayCompletions: Map<number, boolean>
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
  dayCompletions,
  currentWeekNumber,
  onNavigateToWorkout,
  onGenerateRoutine,
  onGenerateNextWeek,
  generating,
  viewingHistory = false,
}: HomeViewProps) {
  const [manageOpen, setManageOpen] = useState(false)

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }
  
  const getDisplayName = () => {
    if (profile?.name) return profile.name;
    if (!profile?.username) return 'Friend';
    const clean = profile.username.split('@')[0];
    // Capitalize first letter
    return clean.charAt(0).toUpperCase() + clean.slice(1);
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
      if ((day.exercises?.length || 0) === 0) {
        total++
        if (dayCompletions.get(dIdx)) completed++
        return
      }
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
    <div className="pb-24 px-4 pt-5 space-y-4 view-transition">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-10">
          <h1 className="text-[22px] font-semibold tracking-tight text-white leading-tight">
            {getGreeting()}, {getDisplayName()}
          </h1>
          <p className="mt-1 text-xs text-slate-300/70">
            {profile?.goal || 'General fitness'} • {profile?.level || 'Beginner'}
          </p>
        </div>
        <div className="shrink-0 glass-soft rounded-full px-3 py-1.5 text-[11px] text-slate-200/80 border border-white/10">
          Week {currentWeekNumber}
        </div>
      </div>

      {/* Today */}
      {generating && !routine ? (
        <WorkoutCardSkeleton />
      ) : routine && todaysPlan ? (
        <GlassCard className="p-4 overflow-hidden">
          <SectionHeader
            title="Today"
            subtitle={todaysPlan.day}
            right={
              <div className="text-[11px] text-slate-300/70 glass-soft px-2.5 py-1 rounded-full border border-white/10">
                {todaysPlan.exercises?.length || 0} exercises
              </div>
            }
          />

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-300/70">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
              ⏱️ Est. {(todaysPlan.exercises?.length || 0) * 8 + 12} min
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
              {progress.percentage}% week done
            </span>
          </div>

          <div className="mt-4">
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

          {/* Secondary info: nutrition peek */}
          {diet && todaysDiet ? (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300/70">Today&apos;s nutrition</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-200/80">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                    🔥 {todaysDiet.total_calories} kcal
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 border border-emerald-400/20 text-emerald-100">
                    🥩 {todaysDiet.total_protein}g
                  </span>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {todaysDiet.meals.slice(0, 2).map((meal, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <span className="text-sm text-white/85 truncate">{meal.name}</span>
                    <span className="text-[11px] text-slate-300/70 shrink-0">{meal.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </GlassCard>
      ) : (
        <NoRoutineEmptyState onGenerate={onGenerateRoutine} />
      )}

      {/* Weekly progress */}
      {generating && routine ? (
        <ProgressSkeleton />
      ) : routine ? (
        <GlassCard className="p-4">
          <SectionHeader
            title="Weekly progress"
            subtitle={`${progress.completed}/${progress.total} items completed`}
          />
          <div className="mt-3 flex justify-center">
            <CircularProgress percentage={progress.percentage} size={104} strokeWidth={7} />
          </div>
        </GlassCard>
      ) : null}

      {/* Manage plan (secondary actions) */}
      {routine && !viewingHistory ? (
        <GlassCard className="p-4">
          <Collapsible
            open={manageOpen}
            onToggle={() => setManageOpen(v => !v)}
            header={
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold text-white">Manage plan</p>
                  <p className="text-xs text-slate-300/70">Regenerate or advance when ready</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            }
          >
            <div className="space-y-2">
              {progress.percentage >= 80 ? (
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
      ) : null}
    </div>
  )
}
