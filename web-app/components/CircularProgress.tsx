'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function CircularProgress({
  percentage,
  size = 100,
  strokeWidth = 6,
  label
}: CircularProgressProps) {
  const gradientId = useId()
  const glowId = useId()
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--cyan)" />
            </linearGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background circle - dark purple tint */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(139, 92, 246, 0.15)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle with glow */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            filter={`url(#${glowId})`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' as const }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(percentage)}%</span>
        </div>
      </div>
      {label && (
        <p className="mt-2 text-xs text-muted text-center">{label}</p>
      )}
    </div>
  )
}
