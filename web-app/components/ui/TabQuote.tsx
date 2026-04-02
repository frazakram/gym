'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getQuote, type QuoteCategory } from '@/lib/quotes'

interface TabQuoteProps {
  /** Category to filter quotes */
  category?: QuoteCategory
  /** Unique key to trigger new quote on view change */
  triggerKey?: string
  /** Duration in ms before auto-dismiss (default 3500) */
  duration?: number
}

export function TabQuote({ category, triggerKey, duration = 3500 }: TabQuoteProps) {
  const [visible, setVisible] = useState(true)
  const [quote] = useState(() => getQuote(category))

  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [triggerKey, duration])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-[#8B5CF6]/10 px-3.5 py-2.5">
            {/* 2px left accent bar */}
            <div className="w-[2px] self-stretch rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#A78BFA] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/70 italic leading-relaxed truncate">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="mt-0.5 text-[10px] text-[#8B8DA3]">— {quote.author}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
