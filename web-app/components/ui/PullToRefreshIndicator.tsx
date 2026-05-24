'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
  threshold?: number
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1)
  const show = pullDistance > 6 || isRefreshing

  // Slides down proportionally with the pull, stays fixed during refresh
  const translateY = isRefreshing ? threshold * 0.55 : Math.min(pullDistance * 0.55, threshold * 0.55)
  // Grows from 0.5 → 1 as user pulls
  const scale = 0.5 + progress * 0.5
  // Fades in as user pulls
  const opacity = Math.min(progress * 2, 1)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          style={{ paddingTop: 8 + translateY }}
        >
          <motion.div
            animate={{ scale }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl"
            style={{
              background: 'rgba(18, 18, 42, 0.92)',
              border: '1px solid rgba(0,229,188, 0.35)',
              backdropFilter: 'blur(12px)',
              willChange: 'transform',
            }}
          >
            <motion.div
              animate={
                isRefreshing
                  ? { rotate: 360 }
                  : { rotate: progress * 300 }
              }
              transition={
                isRefreshing
                  ? { repeat: Infinity, duration: 0.7, ease: 'linear' }
                  : { type: 'spring', stiffness: 300, damping: 20 }
              }
              style={{ willChange: 'transform' }}
            >
              <RefreshCw
                className="w-5 h-5"
                style={{
                  color: progress >= 1 || isRefreshing
                    ? 'var(--primary-light)'
                    : 'rgba(0,229,188, 0.5)',
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
