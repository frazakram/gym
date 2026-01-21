'use client'

import { useState } from 'react'

interface BottomNavProps {
  activeView: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach'
  onViewChange: (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach') => void
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'routine' as const,
      label: 'Routine',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'diet' as const,
      label: 'Diet',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16M8 17V9m4 8v-5m4 5V7" />
        </svg>
      ),
    },
    {
      id: 'workout' as const,
      label: 'Workout',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  const activeItem = navItems.find(item => item.id === activeView)
  const otherItems = navItems.filter(item => item.id !== activeView)

  const handleItemClick = (id: typeof activeView) => {
    onViewChange(id)
    setIsExpanded(false)
  }

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-200"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Floating Pill Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 safe-area-bottom">
        <div
          className={`
            relative flex items-center gap-1
            bg-slate-900/95 backdrop-blur-xl
            border border-white/15 
            shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]
            transition-all duration-300 ease-out
            ${isExpanded
              ? 'rounded-2xl px-2 py-2'
              : 'rounded-full px-2 py-2'
            }
          `}
        >
          {/* Collapsed: Show active item + expand button */}
          {!isExpanded ? (
            <>
              {/* Active item indicator */}
              <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6F61]/15 text-[#FF6F61] transition-all"
              >
                {activeItem?.icon}
                <span className="text-sm font-medium">{activeItem?.label}</span>
              </button>

              {/* Quick access items (first 2 non-active) */}
              {otherItems.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}

              {/* More button */}
              <button
                onClick={() => setIsExpanded(true)}
                className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title="More"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </>
          ) : (
            /* Expanded: Show all items */
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200
                      ${isActive
                        ? 'bg-[#FF6F61]/15 text-[#FF6F61] shadow-[0_0_12px_rgba(255,111,97,0.3)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <div className={isActive ? 'drop-shadow-[0_0_6px_rgba(255,111,97,0.5)]' : ''}>
                      {item.icon}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? '' : 'hidden sm:inline'}`}>
                      {item.label}
                    </span>
                  </button>
                )
              })}

              {/* Close button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-all ml-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
