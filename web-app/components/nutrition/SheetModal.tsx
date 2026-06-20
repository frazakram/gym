'use client'

import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface SheetModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  /** Sticky footer (e.g. confirm button). */
  footer?: ReactNode
}

/**
 * Bottom-sheet modal shell matching the app's liquid-glass language. Used by all
 * nutrition flows (search, scan, photo, draft editor, goals) for a consistent,
 * app-like presentation with a single close affordance and sticky footer.
 */
export function SheetModal({ open, onClose, title, subtitle, children, footer }: SheetModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="lg-remap fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-md"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div
              className="rounded-t-3xl border-t border-x border-white/15 flex flex-col max-h-[88vh]"
              style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(28px) saturate(1.5)' }}
            >
              {/* Grab handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="w-10 h-1 rounded-full bg-black/15" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white font-display truncate">{title}</h2>
                  {subtitle && <p className="text-xs text-muted mt-0.5 leading-snug">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-lg hover:bg-black/5 text-muted hover:text-white transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="px-5 pb-4 overflow-y-auto flex-1 min-h-0">{children}</div>

              {/* Sticky footer */}
              {footer && (
                <div className="px-5 py-3 border-t border-black/5 safe-area-bottom">{footer}</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
