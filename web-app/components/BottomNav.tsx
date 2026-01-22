'use client'

import { useState } from 'react'

interface BottomNavProps {
  activeView: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach'
  onViewChange: (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach') => void
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false)

  // Main nav items (left side: Home, Routine) + (right side: Workout, Profile)
  const leftNavItems = [
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
  ]

  const rightNavItems = [
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

  // Plus menu items (expandable features)
  const plusMenuItems = [
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    },
    {
      id: 'diet' as const,
      label: 'Diet',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'coach' as const,
      label: 'Coach',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
  ]

  const handleItemClick = (id: typeof activeView) => {
    onViewChange(id)
    setIsPlusMenuOpen(false)
  }

  type NavItem = {
    id: 'home' | 'routine' | 'workout' | 'profile'
    label: string
    icon: React.ReactNode
  }

  const NavButton = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
    <button
      onClick={() => handleItemClick(item.id)}
      className={`
        flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]
        ${isActive
          ? 'text-[#FF6F61]'
          : 'text-slate-400 hover:text-white'
        }
      `}
    >
      <div className={isActive ? 'drop-shadow-[0_0_8px_rgba(255,111,97,0.6)]' : ''}>
        {item.icon}
      </div>
      <span className="text-[10px] font-medium">{item.label}</span>
    </button>
  )

  return (
    <>
      {/* Backdrop when plus menu is open */}
      {isPlusMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setIsPlusMenuOpen(false)}
        />
      )}

      {/* Plus Menu Popup */}
      {isPlusMenuOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-col gap-2 p-2 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {plusMenuItems.map((item) => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-w-[160px]
                    border ${item.color}
                    ${isActive ? 'ring-2 ring-white/20' : 'hover:brightness-125'}
                  `}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="flex items-center justify-between bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-2 py-1">
            {/* Left nav items */}
            <div className="flex items-center">
              {leftNavItems.map((item) => (
                <NavButton key={item.id} item={item} isActive={activeView === item.id} />
              ))}
            </div>

            {/* Center Plus Button */}
            <button
              onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
              className={`
                relative flex items-center justify-center w-12 h-12 rounded-full 
                bg-gradient-to-br from-[#FF6F61] to-[#ff8a7a] 
                shadow-[0_4px_20px_rgba(255,111,97,0.4)]
                hover:shadow-[0_4px_24px_rgba(255,111,97,0.6)]
                hover:scale-105
                active:scale-95
                transition-all duration-200
                ${isPlusMenuOpen ? 'rotate-45' : ''}
              `}
            >
              <svg className="w-6 h-6 text-white transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Right nav items */}
            <div className="flex items-center">
              {rightNavItems.map((item) => (
                <NavButton key={item.id} item={item} isActive={activeView === item.id} />
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
