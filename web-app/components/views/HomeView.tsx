'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowRight, BarChart3, CalendarCheck, CalendarPlus, ChevronRight, Dumbbell, Flame,
  Loader2, MapPin, MessageCircle, Moon, Play, RefreshCw, TrendingUp, Utensils,
} from 'lucide-react'
import { Profile, WeeklyRoutine, WeeklyDiet } from '@/types'
import { NoRoutineEmptyState } from '../ui/EmptyState'
import { getInitials } from '../ui/UserAvatar'
import { RestDayCard } from '../ui/RestDayCard'
import { QuoteLoader } from '../ui/QuoteLoader'
import { PersonalRecordsCard } from '../ui/PersonalRecordsCard'
import { WeeklyBreakdownSheet } from '../ui/WeeklyBreakdownSheet'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useLocation } from '@/hooks/useLocation'
import { useTodayNutrition } from '@/hooks/useTodayNutrition'
import {
  buildDayBreakdowns, calculateWeekProgress, estimatedWorkoutMinutes, todaysRoutineIndex, workoutTitle,
} from '@/lib/week-progress'

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
  onGenerateRoutine: (restDays?: string[], forceRegenerate?: boolean) => void
  onGenerateNextWeek: () => void
  generating: boolean
  viewingHistory?: boolean
  routineIsStale?: boolean
  weeksElapsed?: number
  onStartNewWeek?: () => void
  onOpenGymSheet?: () => void
  currentRoutineId?: number | null
  onNavigateToNutrition?: () => void
}

/** Stagger index for the entrance animation (gb-rise). */
const rise = (i: number) => ({ '--i': i }) as CSSProperties

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function displayNameOf(profile: HomeViewProps['profile']) {
  if (profile?.name) return profile.name
  if (!profile?.username) return 'Friend'
  const clean = profile.username.split('@')[0]
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function GbButton({ onClick, busy, variant = 'primary', icon, children }: {
  onClick?: () => void
  busy?: boolean
  variant?: 'primary' | 'secondary'
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className={`gb-btn gb-btn-${variant} gb-press`}>
      {busy ? <Loader2 className="gb-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

function Notice({ tint, icon, title, text, i, children }: {
  tint: 'pink' | 'peach' | 'lav' | 'mint'
  icon: ReactNode
  title: string
  text: string
  i: number
  children: ReactNode
}) {
  return (
    <section className={`gb-notice gb-tint-${tint} gb-rise`} style={rise(i)}>
      <span className="gb-chip" aria-hidden="true">{icon}</span>
      <div className="gb-notice-body">
        <h2 className="gb-notice-title">{title}</h2>
        <p className="gb-notice-text">{text}</p>
        {children}
      </div>
    </section>
  )
}

export function HomeView({
  profile,
  routine,
  diet,
  exerciseCompletions,
  dayCompletions,
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
  currentRoutineId,
  onNavigateToNutrition,
}: HomeViewProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const { city: detectedCity, location: detectedLocation } = useLocation({ autoSave: true })
  const { summary: nutrition, loading: nutritionLoading } = useTodayNutrition()

  const now = new Date()
  const todayIndex = (now.getDay() + 6) % 7
  const todaysPlan = routine?.days?.[todaysRoutineIndex(now, routine.days?.length || 1)]
  const todaysDiet = diet?.days?.[Math.min(todayIndex, (diet.days?.length || 1) - 1)]
  const exerciseCount = todaysPlan?.exercises?.length || 0
  const isRestDay = Boolean(routine && todaysPlan && exerciseCount === 0)
  const progress = calculateWeekProgress(routine, exerciseCompletions, dayCompletions)
  const dayBreakdowns = buildDayBreakdowns(routine, exerciseCompletions, dayCompletions)
  const name = displayNameOf(profile)
  const streak = streakData?.current ?? 0
  const showActions = Boolean(routine && todaysPlan)
  const calorieGoal = nutrition?.goals?.daily_calorie_goal ?? null
  const bestStreak = streakData?.longest ?? 0
  const city = detectedLocation?.source !== 'denied' ? detectedCity : null
  const gymName = profile?.selected_gym_name || null

  const hero = generating && !routine
    ? { big: 'Building your plan', sub: 'Your first week is on its way' }
    : !routine || !todaysPlan
      ? { big: "Let's begin", sub: 'Create your first week of training' }
      : isRestDay
        ? { big: 'Rest day', sub: 'Recover today, train tomorrow' }
        : { big: `${estimatedWorkoutMinutes(exerciseCount)} min`, sub: `Today's workout \u00b7 ${workoutTitle(todaysPlan.day)}` }

  const nutritionTile = nutritionLoading
    ? { count: <>Loading</>, detail: 'Today' }
    : calorieGoal
      ? { count: <><b>{Math.round(nutrition?.totals?.calories ?? 0).toLocaleString('en-IN')}</b> kcal</>, detail: `of ${calorieGoal.toLocaleString('en-IN')} today` }
      : todaysDiet
        ? { count: <><b>{todaysDiet.total_calories}</b> kcal</>, detail: `Planned, ${todaysDiet.total_protein}g protein` }
        : { count: <>Track meals</>, detail: 'Log what you eat' }

  return (
    <div className="gb-screen">
      <h1 className="gb-visually-hidden">Today</h1>

      <div className={`gb-hero${showActions ? '' : ' gb-hero-short'}`}>
        <span className="gb-blob" aria-hidden="true" style={{ ...rise(0), right: -86, top: -96, width: 270, height: 270 }} />
        <span className="gb-blob" aria-hidden="true" style={{ ...rise(1), left: -52, top: 236, width: 104, height: 104 }} />
        <span className="gb-blob" aria-hidden="true" style={{ ...rise(2), right: 26, top: 270, width: 64, height: 64 }} />
        <div className="gb-hero-inner gb-gutter">
          <div className="gb-who gb-rise" style={rise(0)}>
            <span className="gb-avatar" aria-hidden="true">{getInitials(name)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="gb-who-name">{greetingFor(now.getHours())}, {name}</p>
              <p className="gb-who-meta">
                <span><span className="gb-dot" aria-hidden="true" />Week {currentWeekNumber}</span>
                <span className="gb-sep" aria-hidden="true" />
                <span className="gb-num">
                  {streak > 0 ? `${streak} day streak` : `${profile?.goal || 'General fitness'}`}
                </span>
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="gb-big gb-rise" style={rise(1)}>
            <span className="gb-big-num gb-num">{hero.big}</span>
            <span className="gb-big-sub">{hero.sub}</span>
            {bestStreak > 0 || city || gymName ? (
              <div className="gb-hero-pills">
                {bestStreak > 0 && (
                  <span className="gb-hero-pill gb-num">
                    <Flame aria-hidden="true" />
                    <span>Best {bestStreak} days{streakData?.total_xp ? ` \u00b7 ${streakData.total_xp} XP` : ''}</span>
                  </span>
                )}
                {city && (
                  <span className="gb-hero-pill"><MapPin aria-hidden="true" /><span>{city}</span></span>
                )}
                {gymName && (
                  <button type="button" className="gb-hero-pill gb-press" onClick={onOpenGymSheet} aria-label={`Your gym: ${gymName}. Change gym`}>
                    <Dumbbell aria-hidden="true" /><span>{gymName}</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showActions && (
        <div className="gb-overlap gb-gutter gb-rise" style={rise(2)}>
          <div className="gb-action-bar">
            <button type="button" className="gb-press" onClick={() => onNavigateToWorkout(todayIndex)} aria-label="Start Workout">
              <Play fill="currentColor" aria-hidden="true" />Start
            </button>
            <button type="button" className="gb-press" onClick={onNavigateToNutrition}>
              <Utensils aria-hidden="true" />Log food
            </button>
            <button type="button" className="gb-press gb-pink" onClick={onNavigateToCoach} aria-label="Book a coach">
              <MessageCircle aria-hidden="true" />Coach
            </button>
          </div>
        </div>
      )}

      <div className="gb-stack gb-gutter">
        {routineIsStale && routine && !viewingHistory && (
          <Notice tint="lav" i={3} icon={<CalendarPlus />}
            title={`Welcome back! You've been away ${weeksElapsed} week${weeksElapsed !== 1 ? 's' : ''}`}
            text={`Your last routine is from Week ${currentWeekNumber}. Generate a fresh plan for this week.`}>
            <GbButton onClick={onStartNewWeek} busy={generating} icon={<ArrowRight aria-hidden="true" />}>
              {generating ? 'Generating...' : `Start Week ${currentWeekNumber + weeksElapsed}`}
            </GbButton>
          </Notice>
        )}

        {routine && !viewingHistory && !routineIsStale && progress.percentage >= 80 && (
          <Notice tint="mint" i={3} icon={<TrendingUp />}
            title={`Great week! ${progress.percentage}% done`}
            text={`Ready to take it up a notch? Generate Week ${currentWeekNumber + 1} with progressive overload tailored to your goal.`}>
            <GbButton onClick={onGenerateNextWeek} busy={generating} icon={<ArrowRight aria-hidden="true" />}>
              {generating ? 'Generating...' : `Generate Week ${currentWeekNumber + 1}`}
            </GbButton>
          </Notice>
        )}

        {routine && !viewingHistory && now.getDay() === 0 && currentRoutineId && (
          <Notice tint="peach" i={3} icon={<BarChart3 />}
            title="Weekly Report Available"
            text="Review your muscle activation heatmap, achievements, and body progress.">
            <GbButton onClick={() => { window.location.href = `/report?routineId=${currentRoutineId}` }} icon={<BarChart3 aria-hidden="true" />}>
              View &amp; Download Report
            </GbButton>
          </Notice>
        )}

        {generating && !routine ? (
          <QuoteLoader mode="full" category="generation" />
        ) : !routine || !todaysPlan ? (
          <NoRoutineEmptyState onGenerate={onGenerateRoutine} />
        ) : null}

        <div className="gb-tiles">
          {routine && todaysPlan && (
            <button type="button" className="gb-tile gb-tint-pink gb-press gb-lift gb-rise" style={rise(4)} onClick={() => onNavigateToWorkout(todayIndex)}>
              <span className="gb-chip" aria-hidden="true">{isRestDay ? <Moon /> : <Dumbbell />}</span>
              <span className="gb-tile-title">Workout plan</span>
              <span className="gb-tile-count gb-num">{isRestDay ? <>Rest day</> : <><b>{exerciseCount}</b> exercises</>}</span>
              <span className="gb-tile-detail">{workoutTitle(todaysPlan.day)}</span>
            </button>
          )}
          <button type="button" className="gb-tile gb-tint-peach gb-press gb-lift gb-rise" style={rise(5)} onClick={onNavigateToNutrition}>
            <span className="gb-chip" aria-hidden="true"><Utensils /></span>
            <span className="gb-tile-title">Nutrition</span>
            <span className="gb-tile-count gb-num">{nutritionTile.count}</span>
            <span className="gb-tile-detail gb-num">{nutritionTile.detail}</span>
          </button>
          {routine && (
            <button type="button" className="gb-tile gb-tint-lav gb-press gb-lift gb-rise" style={rise(6)} onClick={() => setShowBreakdown(true)}>
              <span className="gb-chip" aria-hidden="true"><CalendarCheck /></span>
              <span className="gb-tile-title">This week</span>
              <span className="gb-tile-count gb-num"><b>{progress.percentage}%</b> done</span>
              <span className="gb-tile-detail gb-num">{progress.completed} of {progress.total} items</span>
            </button>
          )}
          <button type="button" className="gb-tile gb-tint-mint gb-press gb-lift gb-rise" style={rise(7)} onClick={onNavigateToCoach}>
            <span className="gb-chip" aria-hidden="true"><MessageCircle /></span>
            <span className="gb-tile-title">Personal Coach</span>
            <span className="gb-tile-count"><b>1:1</b> sessions</span>
            <span className="gb-tile-detail">Premium, trial allowed</span>
          </button>
        </div>

        {isRestDay && <RestDayCard />}

        {generating && routine ? (
          <QuoteLoader mode="compact" category="workout" />
        ) : routine ? (
          <section className="gb-section gb-rise" style={rise(8)} aria-labelledby="gb-week-h">
            <div className="gb-section-head">
              <h2 id="gb-week-h">Week {currentWeekNumber}</h2>
              <button type="button" className="gb-link" onClick={() => setShowBreakdown(true)}>Details</button>
            </div>
            <div className="gb-timeline">
              <ol>
                {routine.days.map((day, dIdx) => {
                  const breakdown = dayBreakdowns[dIdx]
                  const rest = breakdown.isRestDay
                  const isToday = dIdx === todaysRoutineIndex(now, routine.days.length)
                  const done = breakdown.completed === breakdown.total
                  return (
                    <li key={dIdx} className={done ? 'gb-done' : undefined}>
                      <button type="button" className={`gb-row gb-press${isToday ? ' gb-row-today' : ''}`} onClick={() => onNavigateToWorkout(dIdx)}
                        aria-current={isToday ? 'date' : undefined}>
                        <span className="gb-chip" aria-hidden="true" style={{ color: rest ? 'var(--gb-pink-icon)' : 'var(--gb-lav-icon)' }}>
                          {rest ? <Moon /> : <Dumbbell />}
                        </span>
                        <span className="gb-row-main">
                          <span className="gb-row-title">{workoutTitle(day.day)}</span>
                          <span className="gb-row-sub gb-num">
                            {rest ? (done ? 'Rested' : 'Rest day') : `${breakdown.completed} of ${breakdown.total} done`}
                          </span>
                        </span>
                        <span className="gb-row-time">{isToday ? 'Today' : breakdown.label}</span>
                        <ChevronRight className="gb-row-chev" aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          </section>
        ) : null}

        {routine && <PersonalRecordsCard />}

        {routine && !viewingHistory && (
          <section className="gb-card gb-rise" style={rise(9)} aria-labelledby="gb-manage-h">
            <div>
              <h2 id="gb-manage-h" className="gb-notice-title">Manage plan</h2>
              <p className="gb-notice-text">Regenerate or advance when ready</p>
            </div>
            {routineIsStale && onStartNewWeek ? (
              <GbButton onClick={onStartNewWeek} busy={generating}>
                {generating ? 'Generating...' : `Start Week ${currentWeekNumber + weeksElapsed}`}
              </GbButton>
            ) : progress.percentage >= 80 ? (
              <GbButton onClick={onGenerateNextWeek} busy={generating} variant="secondary">
                {generating ? 'Generating...' : `Generate Week ${currentWeekNumber + 1}`}
              </GbButton>
            ) : null}
            <GbButton onClick={() => onGenerateRoutine(undefined, true)} busy={generating} variant="secondary" icon={<RefreshCw aria-hidden="true" />}>
              Regenerate this week
            </GbButton>
          </section>
        )}
      </div>

      <WeeklyBreakdownSheet
        open={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        weekNumber={currentWeekNumber}
        days={dayBreakdowns}
        totalCompleted={progress.completed}
        totalItems={progress.total}
        percentage={progress.percentage}
      />
    </div>
  )
}
