'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, AlertCircle } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
type Day = typeof DAYS[number]

const RECOMMENDED: Day[] = ['Sat', 'Sun']
const MAX_REST_DAYS = 2

interface RestDayPickerModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (restDays: Day[]) => void
  /** Pre-populate from profile saved preference */
  initialDays?: string[]
}

export function RestDayPickerModal({ open, onClose, onConfirm, initialDays }: RestDayPickerModalProps) {
  const [selected, setSelected] = useState<Set<Day>>(
    () => new Set((initialDays?.length ? initialDays : RECOMMENDED) as Day[])
  )
  const [showWarning, setShowWarning] = useState(false)

  // Reset selection when modal opens, honouring initialDays
  useEffect(() => {
    if (open) {
      setSelected(new Set((initialDays?.length ? initialDays : RECOMMENDED) as Day[]))
      setShowWarning(false)
    }
  }, [open, initialDays])

  function toggle(day: Day) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(day)) {
        next.delete(day)
        setShowWarning(false)
      } else {
        if (next.size >= MAX_REST_DAYS) {
          setShowWarning(true)
          return prev
        }
        next.add(day)
        setShowWarning(false)
      }
      return next
    })
  }

  function useRecommended() {
    setSelected(new Set(RECOMMENDED))
    setShowWarning(false)
  }

  function handleConfirm() {
    onConfirm(Array.from(selected) as Day[])
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 bottom-0 z-50 mb-6 max-w-md mx-auto"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          >
            <div
              className="rounded-2xl border border-white/10 p-5"
              style={{ background: 'rgba(10,12,25,0.97)', backdropFilter: 'blur(28px)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-base font-semibold text-white">Choose rest days</h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    Select up to {MAX_REST_DAYS} rest days — or let AI decide
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Warning */}
              <AnimatePresence>
                {showWarning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mt-2 mb-1 px-3 py-2 rounded-xl bg-amber-500/12 border border-amber-500/30">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-300">
                        Maximum {MAX_REST_DAYS} rest days — deselect one to pick another.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Day pills */}
              <div className="grid grid-cols-7 gap-1.5 mt-3 mb-4">
                {DAYS.map(day => {
                  const isSelected = selected.has(day)
                  const isDisabled = !isSelected && selected.size >= MAX_REST_DAYS
                  return (
                    <button
                      key={day}
                      onClick={() => toggle(day)}
                      className="flex flex-col items-center py-2.5 rounded-xl border transition-all"
                      style={
                        isSelected
                          ? { background: 'rgba(0,229,188,0.18)', borderColor: 'rgba(95,255,224,0.55)', color: '#99FFF0' }
                          : isDisabled
                          ? { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.3)', cursor: 'not-allowed' }
                          : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.7)' }
                      }
                    >
                      <span className="text-[11px] font-semibold">{day}</span>
                      {isSelected && (
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Shortcut row */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={useRecommended}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/8 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sat &amp; Sun
                </button>
                <button
                  onClick={() => { setSelected(new Set()); setShowWarning(false) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/8 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                >
                  Let AI decide
                </button>
              </div>

              {/* Confirm */}
              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #00E5BC 0%, #00B89A 100%)' }}
              >
                {selected.size === 0
                  ? 'Generate (AI picks rest days)'
                  : `Generate with ${selected.size} rest day${selected.size > 1 ? 's' : ''} (${Array.from(selected).join(', ')})`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
