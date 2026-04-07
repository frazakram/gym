'use client'

import { motion } from 'framer-motion'
import { Flame, Trophy } from 'lucide-react'

interface StreakBannerProps {
  current: number
  longest: number
  lastWorkoutDate: string | null
}

export function StreakBanner({ current, longest, lastWorkoutDate }: StreakBannerProps) {
  if (current === 0 && longest === 0) return null

  const isHot = current >= 7
  const isOnFire = current >= 14
  const workedOutToday = lastWorkoutDate === new Date().toISOString().slice(0, 10)

  // Motivational copy
  let message = ''
  if (current === 0) {
    message = "Start a new streak today!"
  } else if (current === 1) {
    message = "Day 1 \u2014 keep it going!"
  } else if (current < 7) {
    message = `${current} days strong \u2014 don\u2019t break it!`
  } else if (current < 14) {
    message = `${current}-day streak! You\u2019re on fire!`
  } else if (current < 30) {
    message = `${current} days \u2014 unstoppable!`
  } else {
    message = `${current}-day streak! Absolute beast!`
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`
        relative overflow-hidden rounded-2xl p-4
        border transition-all duration-300
        ${isOnFire
          ? 'bg-gradient-to-r from-orange-500/15 via-red-500/10 to-yellow-500/10 border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.15)]'
          : isHot
            ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/8 border-orange-500/20'
            : 'bg-gradient-to-r from-primary/10 to-brand-cyan/5 border-primary/20'
        }
      `}
    >
      {/* Animated glow background */}
      {isHot && (
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(249,115,22,0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(249,115,22,0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(249,115,22,0.3) 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative flex items-center gap-3">
        {/* Fire icon with pulse */}
        <motion.div
          animate={current > 0 ? {
            scale: [1, 1.15, 1],
            rotate: [0, -5, 5, 0],
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className={`
            flex items-center justify-center w-12 h-12 rounded-xl
            ${isOnFire
              ? 'bg-orange-500/25 text-orange-400'
              : isHot
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-primary/15 text-primary-light'
            }
          `}
        >
          <Flame className="w-6 h-6" />
        </motion.div>

        {/* Streak info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold font-[family-name:var(--font-display)] ${
              isHot ? 'text-orange-300' : 'text-white'
            }`}>
              {current}
            </span>
            <span className={`text-sm ${isHot ? 'text-orange-300/80' : 'text-primary-lighter'}`}>
              day streak
            </span>
            {workedOutToday && (
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                today
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 ${isHot ? 'text-orange-200/60' : 'text-muted'}`}>
            {message}
          </p>
        </div>

        {/* Best streak badge */}
        {longest > 0 && (
          <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-white">{longest}</span>
            <span className="text-xs text-muted">best</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
