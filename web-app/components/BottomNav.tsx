'use client'

import { motion } from 'framer-motion'

interface BottomNavProps {
  activeView: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics'
  onViewChange: (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics') => void
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'routine' as const,
      label: 'Routine',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'diet' as const,
      label: 'Diet',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16M8 17V9m4 8v-5m4 5V7" />
        </svg>
      ),
    },
    {
      id: 'workout' as const,
      label: 'Workout',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-menu border-t border-white/10 safe-area-bottom">
      <div className="max-w-screen-xl mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`relative flex flex-col items-center justify-center px-4 py-2 rounded-2xl min-w-[72px] transition-colors ui-focus-ring ${
                  isActive ? 'text-emerald-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive ? (
                  <motion.div
                    layoutId="bottom-nav-active"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    className="absolute inset-0 rounded-2xl bg-emerald-400/10 border border-emerald-400/20"
                  />
                ) : null}

                <div className={`relative transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </div>
                <span className={`relative text-xs mt-1 font-medium ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                  {item.label}
                </span>
                {isActive ? (
                  <motion.div
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-300 rounded-full"
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
