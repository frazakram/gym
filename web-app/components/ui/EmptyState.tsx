'use client'

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
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
    <div className={`glass rounded-xl p-8 text-center ${className}`}>
      <div className="mb-4 text-6xl animate-float">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-300/70 mb-6 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
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
