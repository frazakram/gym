'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, XCircle, Moon, Trophy } from 'lucide-react'

export interface DayBreakdown {
  label: string      // 'Mon', 'Tue', etc.
  fullName: string   // Full day name from routine, e.g. "Monday - Push (Chest, Shoulders, Triceps)"
  completed: number
  total: number
  isRestDay: boolean
}

interface WeeklyBreakdownSheetProps {
  open: boolean
  onClose: () => void
  weekNumber: number
  days: DayBreakdown[]
  totalCompleted: number
  totalItems: number
  percentage: number
}

function getBarColor(pct: number) {
  if (pct === 100) return 'bg-emerald-500'
  if (pct >= 50)  return 'bg-primary'
  if (pct > 0)    return 'bg-primary/50'
  return 'bg-white/10'
}

export function WeeklyBreakdownSheet({
  open,
  onClose,
  weekNumber,
  days,
  totalCompleted,
  totalItems,
  percentage,
}: WeeklyBreakdownSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 max-w-screen-md mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            <div
              className="rounded-t-3xl border border-primary/15 px-5 pt-4 pb-10"
              style={{ background: 'rgba(16, 16, 30, 0.98)', backdropFilter: 'blur(24px)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-base font-semibold text-white">Week {weekNumber} Breakdown</p>
                  <p className="text-xs text-muted mt-0.5">
                    {totalCompleted} of {totalItems} items completed
                    <span className="ml-1.5 text-primary-light font-semibold">= {percentage}%</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/12 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Formula callout */}
              <div className="mb-5 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  {percentage >= 80 ? (
                    <Trophy className="w-5 h-5 text-amber-400" />
                  ) : (
                    <span className="text-lg font-bold text-primary-light">{percentage}%</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {totalCompleted} of {totalItems} = {percentage}%
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {percentage >= 100
                      ? 'Perfect week!'
                      : percentage >= 80
                      ? 'Almost there — great effort!'
                      : percentage >= 50
                      ? 'Halfway through the week'
                      : 'Keep going — every rep counts'}
                  </p>
                </div>
              </div>

              {/* Per-day rows */}
              <div className="space-y-2">
                {days.map((day, i) => {
                  const dayPct = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0
                  const isDone = day.completed >= day.total && day.total > 0

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-2xl bg-white/4 border border-white/6 px-3 py-3"
                    >
                      {/* Day label pill */}
                      <div className="w-10 shrink-0 text-center">
                        <span className="text-xs font-semibold text-white/70">{day.label}</span>
                      </div>

                      {/* Status icon */}
                      <div className="shrink-0">
                        {day.isRestDay ? (
                          <Moon className="w-4 h-4 text-white/30" />
                        ) : isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : day.completed > 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-primary/60" />
                        ) : (
                          <XCircle className="w-4 h-4 text-white/20" />
                        )}
                      </div>

                      {/* Day name + progress bar */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 truncate leading-tight">{day.fullName}</p>
                        {!day.isRestDay && (
                          <div className="mt-1.5 h-1.5 rounded-full bg-white/8 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${getBarColor(dayPct)}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${dayPct}%` }}
                              transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Count badge */}
                      <div className="shrink-0 text-right">
                        {day.isRestDay ? (
                          <span className="text-xs text-white/30">Rest</span>
                        ) : (
                          <span
                            className={`text-xs font-semibold ${
                              isDone ? 'text-emerald-400' : day.completed > 0 ? 'text-primary-light' : 'text-white/30'
                            }`}
                          >
                            {day.completed}/{day.total}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
