'use client'

import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const floatVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

export function EmptyState({
  icon = '📋',
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <motion.div
      className={`glass rounded-xl p-8 text-center ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="mb-4 text-6xl"
        variants={floatVariants}
        animate="animate"
      >
        {icon}
      </motion.div>
      <motion.h3
        className="text-lg font-semibold text-white mb-2"
        variants={itemVariants}
      >
        {title}
      </motion.h3>
      <motion.p
        className="text-sm text-[#8B8DA3] mb-6 max-w-sm mx-auto leading-relaxed"
        variants={itemVariants}
      >
        {description}
      </motion.p>
      {actionLabel && onAction && (
        <motion.button
          onClick={onAction}
          className="px-6 py-3 rounded-xl btn-primary text-white font-semibold text-sm transition-all active:scale-95 ui-focus-ring"
          variants={itemVariants}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  )
}

// Specific empty states
export function NoRoutineEmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      icon="💪"
      title="No Routine Yet"
      description="Let's create your personalized workout routine based on your goals and fitness level."
      actionLabel="Generate My Routine"
      onAction={onGenerate}
    />
  )
}

export function NoDietEmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      icon="🥗"
      title="No Diet Plan Yet"
      description="Create a customized meal plan that complements your workout routine and helps you reach your goals."
      actionLabel="Generate Diet Plan"
      onAction={onGenerate}
    />
  )
}

export function NoHistoryEmptyState() {
  return (
    <EmptyState
      icon="📊"
      title="No History Yet"
      description="Your workout history will appear here once you complete some exercises. Start your first workout!"
    />
  )
}
