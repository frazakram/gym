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
          className="fixed bottom-[76px] left-2 right-2 z-50 flex items-center justify-between gap-3 rounded-xl border border-[#8B5CF6]/20 bg-[#0A0A14]/90 backdrop-blur-xl px-4 py-2.5 shadow-lg shadow-[#8B5CF6]/10"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={14} className="text-[#8B5CF6] shrink-0" />
            <span className="text-xs text-white/60 truncate">Exploring GymBro</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push('/login?mode=register')}
              className="rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-3 py-1.5 text-xs font-semibold text-white shadow shadow-[#8B5CF6]/25 hover:shadow-[#8B5CF6]/40 transition-all active:scale-95"
            >
              Sign Up Free →
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-full p-1 text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
