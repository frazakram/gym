'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Calendar,
  ClipboardCheck,
  User,
  Plus,
  BarChart3,
  Utensils,
  MessageCircle,
  Check,
} from 'lucide-react'

interface BottomNavProps {
  activeView: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach'
  onViewChange: (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach') => void
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false)

  const leftNavItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'routine' as const, label: 'Routine', icon: Calendar },
  ]

  const rightNavItems = [
    { id: 'workout' as const, label: 'Workout', icon: ClipboardCheck },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ]

  const plusMenuItems = [
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: BarChart3,
      color: 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/30',
    },
    {
      id: 'diet' as const,
      label: 'Diet',
      icon: Utensils,
      color: 'bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/30',
    },
    {
      id: 'coach' as const,
      label: 'Coach',
      icon: MessageCircle,
      color: 'bg-[#F59E0B]/20 text-[#FCD34D] border-[#F59E0B]/30',
    },
  ]

  const handleItemClick = (id: typeof activeView) => {
    onViewChange(id)
    setIsPlusMenuOpen(false)
  }

  type NavItem = {
    id: 'home' | 'routine' | 'workout' | 'profile'
    label: string
    icon: React.ComponentType<{ className?: string }>
  }

  const NavButton = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
    const Icon = item.icon
    return (
      <button
        onClick={() => handleItemClick(item.id)}
        className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]"
      >
        {/* Active pill indicator above icon */}
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute -top-0.5 w-6 h-[3px] rounded-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.6)]"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}

        <div className={isActive ? 'text-[#8B5CF6] drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'text-slate-400'}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Label only shown for active */}
        <AnimatePresence>
          {isActive && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[10px] font-medium text-[#8B5CF6]"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop when plus menu is open */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsPlusMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Plus Menu Popup */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex flex-col gap-2 p-2 bg-[#0A0A14]/95 backdrop-blur-xl rounded-2xl border border-[#8B5CF6]/20 shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
              {plusMenuItems.map((item, index) => {
                const isActive = activeView === item.id
                const Icon = item.icon
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.07, type: 'spring', stiffness: 300, damping: 25 }}
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-w-[160px]
                      border ${item.color}
                      ${isActive ? 'ring-2 ring-[#8B5CF6]/30' : 'hover:brightness-125'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && <Check className="w-4 h-4 ml-auto" />}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="flex items-center justify-between bg-[#0A0A14]/95 backdrop-blur-xl rounded-2xl border border-[#8B5CF6]/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-2 py-1">
            {/* Left nav items */}
            <div className="flex items-center">
              {leftNavItems.map((item) => (
                <NavButton key={item.id} item={item} isActive={activeView === item.id} />
              ))}
            </div>

            {/* Center FAB Button */}
            <motion.button
              onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
              animate={{ rotate: isPlusMenuOpen ? 45 : 0 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] shadow-[0_4px_20px_rgba(139,92,246,0.4),0_0_40px_rgba(34,211,238,0.15)] hover:shadow-[0_4px_30px_rgba(139,92,246,0.6),0_0_50px_rgba(34,211,238,0.25)]"
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
            </motion.button>

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
