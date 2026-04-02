'use client'

import { useState, useEffect } from 'react'
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
  Ruler,
  X,
} from 'lucide-react'

interface BottomNavProps {
  activeView: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements'
  onViewChange: (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements') => void
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false)
  const [fabPulse, setFabPulse] = useState(false)

  // Subtle pulse every 8s to draw attention when menu is closed
  useEffect(() => {
    if (isPlusMenuOpen) return
    const interval = setInterval(() => {
      setFabPulse(true)
      setTimeout(() => setFabPulse(false), 600)
    }, 8000)
    return () => clearInterval(interval)
  }, [isPlusMenuOpen])

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
      gradient: 'from-[#8B5CF6]/25 to-[#8B5CF6]/10',
      iconColor: 'text-[#A78BFA]',
      borderColor: 'border-[#8B5CF6]/25',
      glowColor: 'shadow-[#8B5CF6]/10',
    },
    {
      id: 'diet' as const,
      label: 'Diet',
      icon: Utensils,
      gradient: 'from-[#10B981]/25 to-[#10B981]/10',
      iconColor: 'text-[#6EE7B7]',
      borderColor: 'border-[#10B981]/25',
      glowColor: 'shadow-[#10B981]/10',
    },
    {
      id: 'coach' as const,
      label: 'Coach',
      icon: MessageCircle,
      gradient: 'from-[#F59E0B]/25 to-[#F59E0B]/10',
      iconColor: 'text-[#FCD34D]',
      borderColor: 'border-[#F59E0B]/25',
      glowColor: 'shadow-[#F59E0B]/10',
    },
    {
      id: 'measurements' as const,
      label: 'Body Tracker',
      icon: Ruler,
      gradient: 'from-[#22D3EE]/25 to-[#22D3EE]/10',
      iconColor: 'text-[#67E8F9]',
      borderColor: 'border-[#22D3EE]/25',
      glowColor: 'shadow-[#22D3EE]/10',
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
            onClick={() => setIsPlusMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Plus Menu Popup — fan-out from FAB */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-50 w-[220px]"
          >
            <div className="flex flex-col gap-1.5 p-2 bg-[#0D0D1A]/98 backdrop-blur-2xl rounded-2xl border border-white/[0.08] shadow-[0_16px_64px_rgba(0,0,0,0.5),0_0_32px_rgba(139,92,246,0.12)]">
              {plusMenuItems.map((item, index) => {
                const isActive = activeView === item.id
                const Icon = item.icon
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 16, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{
                      delay: index * 0.05,
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                    onClick={() => handleItemClick(item.id)}
                    whileTap={{ scale: 0.96 }}
                    className={`
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150
                      bg-gradient-to-r ${item.gradient}
                      border ${item.borderColor}
                      shadow-md ${item.glowColor}
                      ${isActive ? 'ring-1 ring-white/20' : 'hover:brightness-125 active:brightness-90'}
                    `}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center ${item.iconColor}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[13px] font-semibold text-white/90">{item.label}</span>
                    {isActive && <Check className={`w-4 h-4 ml-auto ${item.iconColor}`} />}
                  </motion.button>
                )
              })}
            </div>

            {/* Little arrow/notch pointing down toward FAB */}
            <div className="flex justify-center -mt-[1px]">
              <div className="w-3 h-3 rotate-45 bg-[#0D0D1A]/98 border-r border-b border-white/[0.08]" />
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
            <div className="relative">
              {/* Outer glow ring animation */}
              <AnimatePresence>
                {isPlusMenuOpen && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE]"
                  />
                )}
              </AnimatePresence>

              {/* Subtle pulse ring */}
              {fabPulse && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-[#8B5CF6]/30"
                />
              )}

              <motion.button
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                whileTap={{ scale: 0.85 }}
                animate={{
                  rotate: isPlusMenuOpen ? 135 : 0,
                  scale: isPlusMenuOpen ? 1.08 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full
                  bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE]
                  shadow-[0_4px_20px_rgba(139,92,246,0.4),0_0_40px_rgba(34,211,238,0.15)]
                  hover:shadow-[0_4px_30px_rgba(139,92,246,0.6),0_0_50px_rgba(34,211,238,0.25)]
                  transition-shadow duration-300
                  ${isPlusMenuOpen ? 'shadow-[0_0_40px_rgba(139,92,246,0.5),0_0_60px_rgba(34,211,238,0.3)]' : ''}
                `}
              >
                <AnimatePresence mode="wait">
                  {isPlusMenuOpen ? (
                    <motion.div
                      key="x"
                      initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="plus"
                      initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

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
