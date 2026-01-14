'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function Collapsible({
  open,
  onToggle,
  header,
  children,
  className = '',
}: {
  open: boolean
  onToggle: () => void
  header: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left ui-focus-ring rounded-2xl"
        aria-expanded={open}
      >
        {header}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

