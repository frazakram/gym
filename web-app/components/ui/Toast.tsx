'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  duration?: number
  onClose: () => void
}

export function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining === 0) {
        clearInterval(interval)
        setIsLeaving(true)
        setTimeout(onClose, 250)
      }
    }, 16)

    return () => clearInterval(interval)
  }, [duration, onClose])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(onClose, 250)
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: 'border-emerald-500/50',
          bg: 'bg-emerald-500/15',
          ring: 'ring-emerald-500/20',
          text: 'text-emerald-100',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ),
          iconBg: 'bg-emerald-500/20 text-emerald-300',
          progressBg: 'bg-emerald-400'
        }
      case 'error':
        return {
          border: 'border-red-500/50',
          bg: 'bg-red-500/15',
          ring: 'ring-red-500/20',
          text: 'text-red-100',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          iconBg: 'bg-red-500/20 text-red-300',
          progressBg: 'bg-red-400'
        }
      case 'warning':
        return {
          border: 'border-amber-500/50',
          bg: 'bg-amber-500/15',
          ring: 'ring-amber-500/20',
          text: 'text-amber-100',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          iconBg: 'bg-amber-500/20 text-amber-300',
          progressBg: 'bg-amber-400'
        }
      case 'info':
        return {
          border: 'border-cyan-500/50',
          bg: 'bg-cyan-500/15',
          ring: 'ring-cyan-500/20',
          text: 'text-cyan-100',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconBg: 'bg-cyan-500/20 text-cyan-300',
          progressBg: 'bg-cyan-400'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div
      className={`
        pointer-events-auto w-full max-w-sm
        ${isLeaving ? 'animate-slide-out-to-top' : 'animate-slide-in-from-top'}
      `}
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg}
          ring-1 ${styles.ring}
          shadow-2xl shadow-black/20
          backdrop-blur-xl
        `}
      >
        <div className="flex items-start gap-3 p-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            {styles.icon}
          </div>

          {/* Message */}
          <p className={`flex-1 text-sm font-medium ${styles.text} leading-relaxed pt-1`}>
            {message}
          </p>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className={`h-full ${styles.progressBg} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Toast Container - positioned at top center
interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-3 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  )
}
