'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string
  height?: string
}

export function Skeleton({ className = '', variant = 'rectangular', width, height }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-slate-800/50 bg-[length:200%_100%]'
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  const style = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%')
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className} skeleton-shimmer`}
      style={style}
    />
  )
}

// Card Skeleton
export function CardSkeleton() {
  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="rectangular" height="120px" className="mt-3" />
      <div className="flex gap-2 mt-3">
        <Skeleton variant="rectangular" height="40px" className="flex-1" />
        <Skeleton variant="rectangular" height="40px" className="flex-1" />
      </div>
    </div>
  )
}

// Workout Card Skeleton
export function WorkoutCardSkeleton() {
  return (
    <div className="glass rounded-xl p-4">
      <div className="mb-3">
        <Skeleton variant="text" width="30%" height="12px" className="mb-2" />
        <Skeleton variant="text" width="50%" height="18px" className="mb-1" />
        <Skeleton variant="text" width="60%" height="12px" />
      </div>
      <Skeleton variant="rectangular" height="48px" className="rounded-lg" />
    </div>
  )
}

// Exercise List Skeleton
export function ExerciseListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton variant="text" width="70%" height="16px" className="mb-2" />
              <Skeleton variant="text" width="40%" height="12px" />
            </div>
            <Skeleton variant="circular" width="24px" height="24px" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Profile Stats Skeleton
export function ProfileStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass rounded-lg p-3">
          <Skeleton variant="text" width="50%" height="12px" className="mb-2" />
          <Skeleton variant="text" width="70%" height="20px" />
        </div>
      ))}
    </div>
  )
}

// Weekly Progress Skeleton
export function ProgressSkeleton() {
  return (
    <div className="glass rounded-xl p-4">
      <Skeleton variant="text" width="40%" height="14px" className="mb-4" />
      <div className="flex justify-center">
        <Skeleton variant="circular" width="100px" height="100px" />
      </div>
    </div>
  )
}
