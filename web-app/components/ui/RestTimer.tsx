'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Play, Plus, Minus, X, SkipForward, Timer as TimerIcon } from 'lucide-react'

interface RestTimerProps {
  /** Whether the timer sheet is visible. */
  open: boolean
  /** Initial countdown length in seconds. Changing this restarts the timer. */
  seconds: number
  /** Called when the user dismisses/skips the timer. */
  onClose: () => void
  /** Called whenever the user picks a different preset, so the parent can remember it. */
  onDurationChange?: (seconds: number) => void
}

const PRESETS = [60, 90, 120, 180]

/**
 * Floating rest-timer shown between sets. Pure client-side — no persistence.
 * Auto-starts on mount, supports pause/resume, ±15s, preset switching, and
 * fires a short beep + haptic buzz when the countdown reaches zero.
 */
export function RestTimer({ open, seconds, onClose, onDurationChange }: RestTimerProps) {
  const [duration, setDuration] = useState(seconds)
  const [remaining, setRemaining] = useState(seconds)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishedRef = useRef(false)

  // Restart whenever the timer is (re)opened or the requested duration changes.
  useEffect(() => {
    if (!open) return
    setDuration(seconds)
    setRemaining(seconds)
    setPaused(false)
    setDone(false)
    finishedRef.current = false
  }, [open, seconds])

  const buzz = useCallback(() => {
    // Haptics (mobile).
    try {
      navigator.vibrate?.([120, 60, 120])
    } catch {
      /* not supported */
    }
    // Short beep via WebAudio — best-effort, never throws into the UI.
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
      osc.onended = () => ctx.close().catch(() => {})
    } catch {
      /* autoplay blocked or unsupported */
    }
  }, [])

  // Countdown tick.
  useEffect(() => {
    if (!open || paused || done) return
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (!finishedRef.current) {
            finishedRef.current = true
            setDone(true)
            buzz()
          }
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [open, paused, done, buzz])

  const pickPreset = (s: number) => {
    setDuration(s)
    setRemaining(s)
    setPaused(false)
    setDone(false)
    finishedRef.current = false
    onDurationChange?.(s)
  }

  const adjust = (delta: number) => {
    setRemaining((r) => Math.max(0, r + delta))
    if (done && delta > 0) {
      setDone(false)
      finishedRef.current = false
    }
  }

  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  const pct = duration > 0 ? (remaining / duration) * 100 : 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        >
          <div
            className={`mx-auto max-w-md rounded-3xl border p-4 backdrop-blur-xl shadow-2xl transition-colors ${
              done
                ? 'border-emerald-400/40 bg-emerald-500/10 shadow-emerald-500/20'
                : 'border-white/70 bg-white/90 shadow-primary/20'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Progress ring */}
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke={done ? '#34d399' : 'var(--primary)'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 15.5}
                    animate={{ strokeDashoffset: 2 * Math.PI * 15.5 * (1 - pct / 100) }}
                    transition={{ ease: 'linear', duration: 0.3 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TimerIcon className={`h-4 w-4 ${done ? 'text-emerald-300' : 'text-primary-light'}`} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">{done ? "Rest's over — let's go 💪" : 'Rest'}</p>
                <p className="font-display text-2xl font-bold tabular-nums text-white">
                  {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
                </p>
              </div>

              <button
                onClick={onClose}
                aria-label="Dismiss rest timer"
                className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Controls */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => adjust(-15)}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                <Minus className="h-3.5 w-3.5" /> 15s
              </button>

              {!done ? (
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary/20 py-2 text-sm font-semibold text-primary-light transition hover:bg-primary/30"
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  <SkipForward className="h-4 w-4" />
                  Next set
                </button>
              )}

              <button
                onClick={() => adjust(15)}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5" /> 15s
              </button>
            </div>

            {/* Presets */}
            <div className="mt-2 flex gap-1.5">
              {PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => pickPreset(s)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    duration === s
                      ? 'bg-primary/25 text-primary-light border border-primary/30'
                      : 'border border-transparent text-muted hover:text-white'
                  }`}
                >
                  {s < 60 ? `${s}s` : `${s / 60}m${s % 60 ? '30' : ''}`}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
