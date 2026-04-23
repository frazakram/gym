'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { WeeklyRoutine } from '@/types'
import { ExerciseCard } from '../ExerciseCard'
import { SwipeableExerciseWrapper } from '../ui/SwipeableExercise'
import { ChevronLeft, Moon, PartyPopper } from 'lucide-react'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

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
        <div className="glass rounded-2xl p-8 text-center border-primary/10">
          <h2 className="text-2xl font-bold text-white mb-3 font-display">No Workout Selected</h2>
          <p className="text-muted">Go to Routine to select a workout</p>
        </div>
      </div>
    )
  }

  const day = routine.days[Math.min(selectedDayIndex, routine.days.length - 1)]

  if (!day) {
    return (
      <div className="pb-24 px-4 py-6">
        <div className="glass rounded-2xl p-8 text-center border-primary/10">
          <h2 className="text-2xl font-bold text-white mb-3 font-display">Day Not Found</h2>
          <p className="text-muted">Please select a valid day from the routine</p>
        </div>
      </div>
    )
  }

  const completedCount = day.exercises.filter((_, eIdx) =>
    exerciseCompletions.get(`${selectedDayIndex}-${eIdx}`)
  ).length
  const totalCount = day.exercises.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isRestDay = totalCount === 0
  const restDone = Boolean(dayCompletions.get(selectedDayIndex))
  const allComplete = completedCount === totalCount && totalCount > 0
  
  // Elapsed timer — starts on first exercise toggle
  const [elapsed, setElapsed] = useState(0)
  const [timerStarted, setTimerStarted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!timerStarted || allComplete) return
    intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerStarted, allComplete])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-menu backdrop-blur-xl px-4 py-3 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-1.5 rounded-lg glass-soft hover:bg-primary/10 transition"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate font-display">{day.day}</h1>
            <p className="text-xs text-muted">
              {isRestDay ? (restDone ? 'Rest day completed' : 'Rest day') : `${completedCount}/${totalCount} completed \u2022 ${progressPercentage}%`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 w-full bg-primary/10 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-primary to-brand-cyan h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${isRestDay ? (restDone ? 100 : 0) : progressPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' as const }}
          />
        </div>
      </div>

      {/* Exercise Cards */}
      <motion.div
        className="px-4 pt-4 space-y-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {isRestDay ? (
          <motion.div variants={fadeUp} className="glass rounded-2xl p-5 border border-primary/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-white">Rest day</div>
                <div className="text-xs text-muted mt-1">
                  Take recovery seriously. You can still mark today as complete.
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary-light border border-primary/20">
                <Moon className="w-3 h-3 inline mr-1" />
                Recovery
              </span>
            </div>

            <div className="mt-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  await onToggleRestDay(selectedDayIndex, !restDone)
                }}
                className={`w-full px-5 py-3 rounded-2xl font-semibold text-sm transition border ${restDone
                    ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-100 hover:bg-emerald-400/15'
                    : 'bg-primary/10 border-primary/25 text-primary-light hover:bg-primary/15'
                  }`}
              >
                {restDone ? '\u2713 Marked complete' : 'Mark rest day complete'}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <>
            {day.exercises.map((exercise, exerciseIndex) => {
              const isCompleted = exerciseCompletions.get(`${selectedDayIndex}-${exerciseIndex}`) || false
              return (
                <motion.div key={exerciseIndex} variants={fadeUp}>
                  <SwipeableExerciseWrapper
                    isCompleted={isCompleted}
                    onComplete={() => {
                      onToggleExercise(selectedDayIndex, exerciseIndex, true)
                    }}
                    onSkip={() => {
                      onToggleExercise(selectedDayIndex, exerciseIndex, false)
                    }}
                  >
                    <ExerciseCard
                      exercise={exercise}
                      dayIndex={selectedDayIndex}
                      exerciseIndex={exerciseIndex}
                      routineId={currentRoutineId}
                      isCompleted={isCompleted}
                      onToggle={(completed) => {
                        if (!timerStarted) setTimerStarted(true)
                        onToggleExercise(selectedDayIndex, exerciseIndex, completed)
                      }}
                      onEnsureRoutineSaved={onEnsureRoutineSaved}
                    />
                  </SwipeableExerciseWrapper>
                </motion.div>
              )
            })}
          </>
        )}
      </motion.div>

      {/* Celebration */}
      <AnimatePresence>
        {allComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="px-4 pt-4"
          >
            <div className="glass rounded-xl p-5 text-center bg-gradient-to-r from-primary/15 to-brand-cyan/10 border border-primary/25 relative overflow-hidden">
              {/* Celebration glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_70%)]" />

              <motion.div
                className="relative z-10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
              >
                <PartyPopper className="w-10 h-10 text-primary-light mx-auto mb-3" />
              </motion.div>
              <motion.h3
                className="relative z-10 text-base font-bold text-white mb-1 font-display"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Workout Complete!
              </motion.h3>
              <motion.p
                className="relative z-10 text-xs text-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Great job finishing today&apos;s workout
                {elapsed > 0 && <span className="ml-1 text-primary-lighter">· {formatTime(elapsed)}</span>}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
