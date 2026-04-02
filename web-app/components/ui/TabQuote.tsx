'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
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
          className="overflow-hidden pt-14"
        >
          <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl bg-[#8B5CF6]/[0.08] border border-[#8B5CF6]/20 px-3.5 py-3 shadow-sm shadow-[#8B5CF6]/5">
            {/* Left accent bar */}
            <div className="w-[3px] self-stretch rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#A78BFA] shrink-0" />
            <Sparkles className="w-3.5 h-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-white/90 italic leading-relaxed">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="mt-1 text-[11px] text-[#A78BFA]/80 font-medium">— {quote.author}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
