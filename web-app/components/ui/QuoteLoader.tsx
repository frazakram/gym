'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { getRandomQuote, type QuoteCategory } from '@/lib/quotes'

interface QuoteLoaderProps {
  /** Visual mode: full = glass card with progress bar, compact = inline text only */
  mode?: 'full' | 'compact'
  /** Filter quotes by category */
  category?: QuoteCategory
  /** Additional CSS class */
  className?: string
}

export function QuoteLoader({ mode = 'full', category, className = '' }: QuoteLoaderProps) {
  const [quote, setQuote] = useState(() => getRandomQuote(category))

  // Rotate quote every 5 seconds in full mode
  useEffect(() => {
    if (mode !== 'full') return
    const interval = setInterval(() => {
      setQuote(getRandomQuote(category))
    }, 5000)
    return () => clearInterval(interval)
  }, [mode, category])

  if (mode === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-muted ${className}`}>
        <Sparkles className="w-3.5 h-3.5 text-primary-light shrink-0" />
        <p className="text-xs italic truncate">&ldquo;{quote.text}&rdquo;</p>
      </div>
    )
  }

  // Full mode — glass card with progress bar and shimmer
  return (
    <div className={`glass border-primary/10 rounded-2xl p-5 relative overflow-hidden ${className}`}>
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/10 overflow-hidden rounded-full">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary-light"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
        />
      </div>

      {/* Pulsing dot */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-light" />
        </span>
        <span className="text-xs text-muted uppercase tracking-wider font-medium">Generating</span>
      </div>

      {/* Quote with AnimatePresence */}
      <div className="min-h-[48px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={quote.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-sm text-white/85 italic leading-relaxed">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="mt-1.5 text-xs text-muted">— {quote.author}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Shimmer lines */}
      <div className="mt-4 space-y-2">
        <div className="h-2 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 bg-[length:200%_100%] skeleton-shimmer" style={{ width: '80%' }} />
        <div className="h-2 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 bg-[length:200%_100%] skeleton-shimmer" style={{ width: '55%' }} />
      </div>
    </div>
  )
}
