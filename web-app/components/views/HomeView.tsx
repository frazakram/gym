'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Profile, WeeklyRoutine, WeeklyDiet } from '@/types'
import { CircularProgress } from '../CircularProgress'
import { NoRoutineEmptyState } from '../ui/EmptyState'
import { AnimatedButton } from '../ui/AnimatedButton'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { Collapsible } from '../ui/Collapsible'
import { UserAvatar } from '../ui/UserAvatar'
import { StreakBanner } from '../ui/StreakBanner'
import { RestDayCard } from '../ui/RestDayCard'
import { QuoteLoader } from '../ui/QuoteLoader'
import { ArrowRight, Timer, Percent, MessageCircle, ChevronRight, Flame, Drumstick, CalendarPlus } from 'lucide-react'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

interface HomeViewProps {
  profile: (Profile & { username?: string }) | null
  routine: WeeklyRoutine | null
  diet: WeeklyDiet | null
  exerciseCompletions: Map<string, boolean>
  dayCompletions: Map<number, boolean>
  heatmapData?: Array<{ date: string; value: number }>
  streakData?: { current: number; longest: number; last_workout_date: string | null } | null
  currentWeekNumber: number
  onNavigateToWorkout: (dayIndex?: number) => void
  onNavigateToCoach: () => void
  onGenerateRoutine: () => void
  onGenerateNextWeek: () => void
  generating: boolean
  viewingHistory?: boolean
  routineIsStale?: boolean
  weeksElapsed?: number
  onStartNewWeek?: () => void
}

export function HomeView({
  profile,
  routine,
  diet,
  exerciseCompletions,
  dayCompletions,
  heatmapData = [],
  streakData,
  currentWeekNumber,
  onNavigateToWorkout,
  onNavigateToCoach,
  onGenerateRoutine,
  onGenerateNextWeek,
  generating,
  viewingHistory = false,
  routineIsStale = false,
  weeksElapsed = 0,
  onStartNewWeek,
}: HomeViewProps) {
  const [manageOpen, setManageOpen] = useState(false)

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
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  const todayIndex = (new Date().getDay() + 6) % 7
  const todaysPlan = routine?.days?.[Math.min(todayIndex, (routine.days?.length || 1) - 1)]
  const todaysDiet = diet?.days?.[Math.min(todayIndex, (diet.days?.length || 1) - 1)]

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
    <motion.div
      className="pb-24 px-4 pt-5 space-y-4"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Greeting */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 pt-10">
          <UserAvatar
            name={profile?.name}
            username={profile?.username}
            size={48}
            className="shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-white leading-tight font-display">
              {getGreeting()}, {getDisplayName()}
            </h1>
            <p className="mt-1 text-xs text-muted">
              {profile?.goal || 'General fitness'} &bull; {profile?.level || 'Beginner'}
            </p>
          </div>
        </div>
        <div className="shrink-0 glass-soft rounded-full px-3 py-1.5 text-xs text-primary-light border border-primary/20">
          Week {currentWeekNumber}
        </div>
      </motion.div>

      {/* Streak flame banner */}
      {streakData && (streakData.current > 0 || streakData.longest > 0) && (
        <motion.div variants={fadeUp}>
          <StreakBanner
            current={streakData.current}
            longest={streakData.longest}
            lastWorkoutDate={streakData.last_workout_date}
          />
        </motion.div>
      )}

      {/* Stale routine banner */}
      {routineIsStale && routine && !viewingHistory && (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-4 bg-gradient-to-r from-primary/10 to-brand-cyan/5 border-primary/25">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <CalendarPlus className="w-5 h-5 text-primary-light" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  Welcome back! You&apos;ve been away {weeksElapsed} week{weeksElapsed !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted mt-1">
                  Your last routine is from Week {currentWeekNumber}. Generate a fresh plan for this week.
                </p>
                <div className="mt-3">
                  <AnimatedButton
                    onClick={onStartNewWeek}
                    disabled={generating}
                    loading={generating}
                    variant="primary"
                    fullWidth
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    {generating ? 'Generating...' : `Start Week ${currentWeekNumber + weeksElapsed}`}
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Today */}
      {generating && !routine ? (
        <motion.div variants={fadeUp}><QuoteLoader mode="full" category="generation" /></motion.div>
      ) : routine && todaysPlan ? (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-4 overflow-hidden">
            <SectionHeader
              title="Today"
              subtitle={todaysPlan.day}
              right={
                <div className="text-xs text-muted glass-soft px-2.5 py-1 rounded-full border border-primary/15">
                  {todaysPlan.exercises?.length || 0} exercises
                </div>
              }
            />

            <div className="mt-3 flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 border border-primary/10">
                <Timer className="w-3 h-3" />
                Est. {(todaysPlan.exercises?.length || 0) * 8 + 12} min
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 border border-primary/10">
                <Percent className="w-3 h-3" />
                {progress.percentage}% week done
              </span>
            </div>

            <div className="mt-4">
              <AnimatedButton
                onClick={() => onNavigateToWorkout(todayIndex)}
                variant="primary"
                fullWidth
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Start Workout
              </AnimatedButton>
            </div>

            {/* Nutrition peek */}
            {diet && todaysDiet ? (
              <div className="mt-4 pt-4 border-t border-primary/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Today&apos;s nutrition</p>
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 border border-primary/10">
                      <Flame className="w-3 h-3 text-orange-400" />
                      {todaysDiet.total_calories} kcal
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 border border-emerald-400/20 text-emerald-100">
                      <Drumstick className="w-3 h-3" />
                      {todaysDiet.total_protein}g
                    </span>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {todaysDiet.meals.slice(0, 2).map((meal, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 bg-white/5 border border-primary/10 rounded-xl px-3 py-2">
                      <span className="text-sm text-white/85 truncate">{meal.name}</span>
                      <span className="text-xs text-muted shrink-0">{meal.calories} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp}>
          <NoRoutineEmptyState onGenerate={onGenerateRoutine} />
        </motion.div>
      )}

      {/* Rest Day Recovery Content */}
      {routine && todaysPlan && !(todaysPlan.exercises?.length) && (
        <motion.div variants={fadeUp}>
          <RestDayCard />
        </motion.div>
      )}

      {/* Weekly progress — compact bar */}
      {generating && routine ? (
        <motion.div variants={fadeUp}><QuoteLoader mode="compact" category="workout" /></motion.div>
      ) : routine ? (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">Weekly Progress</p>
                <p className="text-xs text-muted mt-0.5">{progress.completed} of {progress.total} workouts this week</p>
              </div>
              <CircularProgress percentage={progress.percentage} size={48} strokeWidth={4} />
            </div>
            <div className="flex gap-1">
              {heatmapData.slice(-7).map((d, i) => {
                const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full h-2 rounded-full"
                      style={{
                        backgroundColor: d.value >= 1 ? 'var(--primary)' : d.value > 0 ? '#6d3fc4' : '#252540',
                        boxShadow: d.value >= 1 ? '0 0 6px rgba(139,92,246,0.4)' : 'none',
                      }}
                    />
                    <span className="text-xs text-white/70">{dayLabels[i]}</span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>
      ) : null}

      {/* Personal coach */}
      <motion.div variants={fadeUp}>
        <GlassCard className="p-4">
          <SectionHeader
            title="Personal Coach"
            subtitle="Premium (trial allowed) \u2022 Book a 1:1 session"
            right={
              <div className="text-xs text-amber-200 bg-amber-400/10 border border-amber-400/20 inline-flex px-2.5 py-1 rounded-full">
                Premium
              </div>
            }
          />
          <div className="mt-3">
            <AnimatedButton
              onClick={onNavigateToCoach}
              variant="secondary"
              fullWidth
              icon={<MessageCircle className="w-4 h-4" />}
            >
              Book a coach
            </AnimatedButton>
            <p className="mt-2 text-xs text-muted">
              You&apos;ll be able to call/email the coach and submit a booking request from the next screen.
            </p>
          </div>
        </GlassCard>
      </motion.div>

      {/* Manage plan */}
      {routine && !viewingHistory ? (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-4">
            <Collapsible
              open={manageOpen}
              onToggle={() => setManageOpen(v => !v)}
              header={
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-sm font-semibold text-white">Manage plan</p>
                    <p className="text-xs text-muted">Regenerate or advance when ready</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-primary transition-transform ${manageOpen ? 'rotate-90' : ''}`} />
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
                ) : progress.percentage >= 80 ? (
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
      ) : null}
    </motion.div>
  )
}
