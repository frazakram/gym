'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDemoResponse, isMutationAuthRequired } from '@/lib/demo-data'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, LogIn, UserPlus, X } from 'lucide-react'

interface DemoModeContextValue {
  isDemo: boolean
  promptLogin: () => void
}

const DemoModeContext = createContext<DemoModeContextValue>({ isDemo: false, promptLogin: () => {} })

export const useDemoMode = () => useContext(DemoModeContext)

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [promptMessage, setPromptMessage] = useState('')
  const originalFetchRef = useRef<typeof window.fetch | null>(null)
  const router = useRouter()

  const promptLogin = useCallback((message?: string) => {
    setPromptMessage(message || 'Create your free account to unlock this feature')
    setShowLoginPrompt(true)
  }, [])

  useEffect(() => {
    // Set demo CSRF cookie
    document.cookie = 'csrf_token=demo-csrf-token; path=/'

    // Save original fetch
    originalFetchRef.current = window.fetch.bind(window)

    // Intercept fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method || 'GET'

      // Only intercept /api/ routes
      if (!url.includes('/api/')) {
        return originalFetchRef.current!(input, init)
      }

      // Handle GET requests with demo data
      if (method.toUpperCase() === 'GET') {
        const demo = getDemoResponse(url, 'GET')
        if (demo) {
          return new Response(JSON.stringify(demo.body), {
            status: demo.status,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }

      // Handle logout — redirect to landing
      if (url.includes('/api/auth/logout')) {
        router.push('/')
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Check if this mutation requires auth
      if (isMutationAuthRequired(url, method)) {
        // Determine context message
        let msg = 'Create your free account to unlock this feature'
        if (url.includes('/routine/generate')) msg = 'Sign up to generate your personalized AI workout routine'
        else if (url.includes('/diet/generate')) msg = 'Sign up to generate your personalized AI diet plan'
        else if (url.includes('/profile') && method.toUpperCase() === 'PUT') msg = 'Sign up to save your profile and preferences'
        else if (url.includes('/routines') && method.toUpperCase() === 'POST') msg = 'Sign up to save your workout routine'
        else if (url.includes('/coach')) msg = 'Sign up to book sessions with a coach'

        promptLogin(msg)

        // Return a success-like response so the UI doesn't break
        return new Response(JSON.stringify({ demo: true, message: msg }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Allow casual mutations silently (completions, measurements, analyze)
      if (url.includes('/api/')) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return originalFetchRef.current!(input, init)
    }

    // Cleanup
    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current
      }
      // Clear demo csrf cookie
      document.cookie = 'csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }, [promptLogin, router])

  return (
    <DemoModeContext.Provider value={{ isDemo: true, promptLogin }}>
      {children}

      {/* Login Prompt Modal */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowLoginPrompt(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm rounded-2xl border border-[#8B5CF6]/20 bg-[#0A0A14]/95 backdrop-blur-xl p-6 shadow-2xl shadow-[#8B5CF6]/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="absolute right-3 top-3 rounded-full p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Icon */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] shadow-lg shadow-[#8B5CF6]/30">
                <Lock size={24} className="text-white" />
              </div>

              {/* Text */}
              <h3 className="text-center text-lg font-semibold text-white mb-2">
                Unlock Full Access
              </h3>
              <p className="text-center text-sm text-white/60 mb-6">
                {promptMessage}
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/login?mode=register')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8B5CF6]/25 hover:shadow-[#8B5CF6]/40 transition-all active:scale-[0.98]"
                >
                  <UserPlus size={18} />
                  Sign Up Free
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  <LogIn size={18} />
                  Already have an account? Login
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="text-sm text-white/40 hover:text-white/60 transition-colors py-1"
                >
                  Continue Exploring
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DemoModeContext.Provider>
  )
}
