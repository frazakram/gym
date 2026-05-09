'use client'

import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
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
import { ArrowRight, Timer, Percent, MessageCircle, ChevronRight, Flame, Drumstick, CalendarPlus, MapPin, TrendingUp, ChevronDown, Dumbbell } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import { WeeklyBreakdownSheet, type DayBreakdown } from '../ui/WeeklyBreakdownSheet'

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

interface HomeViewProps {
  profile: (Profile & { username?: string }) | null
  routine: WeeklyRoutine | null
  diet: WeeklyDiet | null
  exerciseCompletions: Map<string, boolean>
  dayCompletions: Map<number, boolean>
  heatmapData?: Array<{ date: string; value: number }>
  streakData?: { current: number; longest: number; last_workout_date: string | null; total_xp?: number } | null
  currentWeekNumber: number
  onNavigateToWorkout: (dayIndex?: number) => void
  onNavigateToCoach: () => void
  onGenerateRoutine: (restDays?: string[]) => void
  onGenerateNextWeek: () => void
  generating: boolean
  viewingHistory?: boolean
  routineIsStale?: boolean
  weeksElapsed?: number
  onStartNewWeek?: () => void
  onOpenGymSheet?: () => void
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
  onOpenGymSheet,
}: HomeViewProps) {
  const [manageOpen, setManageOpen] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const { city: detectedCity, location: detectedLocation, loading: locationLoading } = useLocation({ autoSave: true })

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

  // Build per-day breakdown for the sheet — derived from existing props, no extra fetch
  const buildDayBreakdowns = (): DayBreakdown[] => {
    if (!routine) return []
    const SHORT: Record<string, string> = {
      monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
      friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
    }
    return routine.days.map((day, dIdx) => {
      const isRestDay = (day.exercises?.length || 0) === 0
      const firstWord = day.day.split(/[\s\-–]/)[0].toLowerCase()
      const label = SHORT[firstWord] ?? day.day.slice(0, 3)

      // Derive a cleaner display name: strip the week-number prefix if present
      // e.g. "Monday - Push (Chest, Shoulders, Triceps)" → keep as-is
      // but trim very long strings to ~40 chars
      const fullName = day.day.length > 42 ? day.day.slice(0, 40) + '…' : day.day

      if (isRestDay) {
        const done = dayCompletions.get(dIdx) === true
        return { label, fullName, completed: done ? 1 : 0, total: 1, isRestDay: true }
      }

      const total = day.exercises.length
      let completed = 0
      day.exercises.forEach((_, eIdx) => {
        if (exerciseCompletions.get(`${dIdx}-${eIdx}`)) completed++
      })
      return { label, fullName, completed, total, isRestDay: false }
    })
  }

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
            {detectedLocation?.source !== 'denied' && (
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {locationLoading ? (
                  <div className="inline-flex h-5 w-24 animate-pulse rounded-full bg-white/5 border border-white/10" />
                ) : detectedCity ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium
                               bg-white/5 text-white/80 border border-white/10
                               dark:bg-[#0d1117] dark:text-white/70 dark:border-white/10"
                  >
                    <MapPin className="w-3 h-3 text-primary-light" />
                    {detectedCity}
                  </span>
                ) : null}
                {profile?.selected_gym_name && (
                  <button
                    type="button"
                    onClick={onOpenGymSheet}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium
                               bg-white/5 text-white/70 border border-white/10
                               hover:bg-white/8 transition-colors"
                  >
                    <Dumbbell className="w-3 h-3 text-primary-light" />
                    {profile.selected_gym_name}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 glass-soft rounded-full px-3 py-1.5 text-xs text-white border border-primary/20">
          Week {currentWeekNumber}
        </div>
      </motion.div>

      {/* Streak flame banner */}
      {streakData && (streakData.current > 0 || streakData.longest > 0 || (streakData.total_xp ?? 0) > 0) && (
        <motion.div variants={fadeUp}>
          <StreakBanner
            current={streakData.current}
            longest={streakData.longest}
            lastWorkoutDate={streakData.last_workout_date}
            totalXp={streakData.total_xp}
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
            <button
              type="button"
              onClick={() => setShowBreakdown(true)}
              className="w-full flex items-center justify-between mb-3 hover:bg-white/4 active:bg-white/6 -mx-1 px-1 py-1 rounded-xl transition-colors group"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Weekly Progress</p>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                  {progress.completed} of {progress.total} items this week
                  <ChevronDown className="w-3 h-3 opacity-40 group-hover:opacity-70 transition-opacity" />
                </p>
              </div>
              <CircularProgress percentage={progress.percentage} size={48} strokeWidth={4} />
            </button>
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

      {/* Generate Next Week banner — shown when 80%+ complete */}
      {routine && !viewingHistory && !routineIsStale && progress.percentage >= 80 && (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-4 bg-gradient-to-br from-violet-600/15 via-primary/10 to-brand-cyan/10 border-primary/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary-light" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  Great week! {progress.percentage}% done 🎉
                </p>
                <p className="text-xs text-muted mt-1">
                  Ready to take it up a notch? Generate Week {currentWeekNumber + 1} with progressive overload tailored to your goal.
                </p>
                <div className="mt-3">
                  <AnimatedButton
                    onClick={onGenerateNextWeek}
                    disabled={generating}
                    loading={generating}
                    variant="primary"
                    fullWidth
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    {generating ? 'Generating...' : `Generate Week ${currentWeekNumber + 1}`}
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

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

      {/* Weekly breakdown sheet — rendered outside card stack to avoid overflow clipping */}
      <WeeklyBreakdownSheet
        open={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        weekNumber={currentWeekNumber}
        days={buildDayBreakdowns()}
        totalCompleted={progress.completed}
        totalItems={progress.total}
        percentage={progress.percentage}
      />
    </motion.div>
  )
}
