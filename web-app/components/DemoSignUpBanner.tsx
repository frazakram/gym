'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

export function DemoSignUpBanner() {
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 1 }}
          className="fixed bottom-[76px] left-2 right-2 z-50 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-navy-0/90 backdrop-blur-xl px-4 py-2.5 shadow-lg shadow-primary/10"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={14} className="text-primary shrink-0" />
            <span className="text-xs text-white/60 truncate">Exploring GymBro</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push('/login?mode=register')}
              className="rounded-lg bg-gradient-to-r from-primary to-[#6D28D9] px-3 py-1.5 text-xs font-semibold text-white shadow shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95"
            >
              Sign Up Free →
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-full p-1 text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
