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
        setTimeout(onClose, 300)
      }
    }, 16)

    return () => clearInterval(interval)
  }, [duration, onClose])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(onClose, 300)
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-200',
          icon: '✓',
          progressBg: 'bg-emerald-500'
        }
      case 'error':
        return {
          border: 'border-red-500/40',
          bg: 'bg-red-500/10',
          text: 'text-red-200',
          icon: '✕',
          progressBg: 'bg-red-500'
        }
      case 'warning':
        return {
          border: 'border-amber-500/40',
          bg: 'bg-amber-500/10',
          text: 'text-amber-200',
          icon: '⚠',
          progressBg: 'bg-amber-500'
        }
      case 'info':
        return {
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-500/10',
          text: 'text-cyan-200',
          icon: 'ℹ',
          progressBg: 'bg-cyan-500'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div
      className={`
        fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-md
        ${isLeaving ? 'animate-slide-out-down' : 'animate-slide-in-up'}
      `}
    >
      <div className={`glass-menu rounded-xl border ${styles.border} ${styles.bg} overflow-hidden shadow-2xl`}>
        <div className="flex items-start gap-3 p-4">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${styles.bg} flex items-center justify-center text-sm font-bold ${styles.text}`}>
            {styles.icon}
          </div>
          <p className={`flex-1 text-sm ${styles.text} leading-relaxed`}>
            {message}
          </p>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
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

// Toast Container to manage multiple toasts
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
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ bottom: `${6 + index * 5}rem` }}
          className="fixed left-0 right-0 z-[60]"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </>
  )
}
