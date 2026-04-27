'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Calendar, ClipboardCheck, User, Plus,
  BarChart3, Utensils, MessageCircle, Ruler, Users,
} from 'lucide-react'

type View = 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements' | 'communities'

interface BottomNavProps {
  activeView: View
  onViewChange: (view: View) => void
}

type FloatItem = {
  id: View
  label: string
  emoji: string
  icon: React.ComponentType<{ className?: string }>
  color: string       // accent for icon
  topPct: number      // viewport % from top
  leftPct: number     // viewport % from left
  bobDur: number      // seconds for the gentle bob loop
  bobOffset: number   // px range for the bob
}

// Hand-placed constellation: symmetric quincunx (4 corners + 1 center)
// Order tuned so they arrive in a visually pleasing sequence:
// center → upper-left → upper-right → lower-left → lower-right
const FLOAT_ITEMS: FloatItem[] = [
  { id: 'communities',  label: 'Community', emoji: '🌍', icon: Users,         color: '#F472B6', topPct: 40, leftPct: 50, bobDur: 6.0, bobOffset: 8 },
  { id: 'analytics',    label: 'Analytics', emoji: '📊', icon: BarChart3,     color: '#A78BFA', topPct: 20, leftPct: 25, bobDur: 5.2, bobOffset: 7 },
  { id: 'diet',         label: 'Diet',      emoji: '🍽️', icon: Utensils,      color: '#34D399', topPct: 20, leftPct: 75, bobDur: 4.6, bobOffset: 6 },
  { id: 'measurements', label: 'Body',      emoji: '📏', icon: Ruler,         color: '#67E8F9', topPct: 62, leftPct: 25, bobDur: 4.8, bobOffset: 6 },
  { id: 'coach',        label: 'Coach',     emoji: '💬', icon: MessageCircle, color: '#FBBF24', topPct: 62, leftPct: 75, bobDur: 5.4, bobOffset: 7 },
]

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const [open, setOpen] = useState(false)
  const pick = (id: View) => { onViewChange(id); setOpen(false) }

  type NI = { id: 'home' | 'routine' | 'workout' | 'profile'; label: string; icon: React.ComponentType<{ className?: string }> }

  const Tab = ({ item, isActive }: { item: NI; isActive: boolean }) => {
    const Icon = item.icon
    return (
      <button
        onClick={() => pick(item.id)}
        className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]"
      >
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute -top-0.5 w-6 h-[3px] rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <div className={isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'text-gray-500 dark:text-slate-400'}>
          <Icon className="w-5 h-5" />
        </div>
        <AnimatePresence>
          {isActive && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs font-medium text-primary"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    )
  }

  const FloatingIcon = ({ item, index }: { item: FloatItem; index: number }) => {
    const Icon = item.icon
    const isActive = activeView === item.id

    return (
      <motion.button
        onClick={() => pick(item.id)}
        // Mount/unmount: each icon rises from the FAB with a spin, lands with a soft overshoot
        initial={{ opacity: 0, scale: 0.2, y: 140, rotate: -45 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
        exit={{
          opacity: 0,
          scale: 0.2,
          y: 80,
          rotate: 30,
          transition: { duration: 0.22, ease: 'easeIn', delay: (FLOAT_ITEMS.length - 1 - index) * 0.05 },
        }}
        transition={{
          type: 'spring',
          stiffness: 240,
          damping: 16,
          mass: 0.9,
          delay: 0.15 + index * 0.18,
        }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        className="absolute pointer-events-auto select-none"
        style={{
          top: `${item.topPct}%`,
          left: `${item.leftPct}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Idle bob */}
        <motion.div
          animate={{ y: [-item.bobOffset, item.bobOffset, -item.bobOffset] }}
          transition={{ duration: item.bobDur, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
          className="flex flex-col items-center gap-1"
        >
          {/* Emoji */}
          <span
            className="text-[34px] leading-none"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }}
          >
            {item.emoji}
          </span>

          {/* Lucide icon (small, accent-colored, beneath emoji) */}
          <span
            style={{
              color: item.color,
              filter: `drop-shadow(0 0 8px ${item.color}88)`,
            }}
          >
            <Icon className="w-5 h-5" />
          </span>

          {/* Label */}
          <span
            className="text-[12.5px] font-semibold tracking-wide text-white whitespace-nowrap"
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 0 1px rgba(0,0,0,0.6)',
            }}
          >
            {item.label}
          </span>

          {/* Active indicator: tiny dot under the label */}
          {isActive && (
            <motion.div
              layoutId="float-active"
              className="w-1.5 h-1.5 rounded-full mt-0.5"
              style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
            />
          )}
        </motion.div>
      </motion.button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-xl"
            style={{ zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating icon constellation */}
      <AnimatePresence>
        {open && (
          <div
            key="float"
            className="fixed inset-0 pointer-events-none max-w-md mx-auto"
            style={{ zIndex: 51 }}
          >
            {FLOAT_ITEMS.map((item, i) => (
              <FloatingIcon key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 safe-area-bottom" style={{ zIndex: 50 }}>
        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="flex items-center justify-between bg-navy-0/95 backdrop-blur-xl rounded-2xl border border-primary/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-2 py-1">

            <div className="flex items-center">
              {([
                { id: 'home' as const, label: 'Home', icon: Home },
                { id: 'routine' as const, label: 'Routine', icon: Calendar },
              ] as NI[]).map(t => <Tab key={t.id} item={t} isActive={activeView === t.id} />)}
            </div>

            {/* FAB */}
            <div className="relative -mt-6" style={{ zIndex: 52 }}>
              <motion.button
                onClick={() => setOpen(v => !v)}
                whileTap={{ scale: 0.84 }}
                animate={{ scale: open ? 1.1 : 1, rotate: open ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary-dark to-brand-cyan"
                style={{
                  boxShadow: open
                    ? '0 0 0 6px rgba(139,92,246,0.18), 0 0 32px rgba(139,92,246,0.55)'
                    : '0 4px 24px rgba(139,92,246,0.4), 0 0 40px rgba(34,211,238,0.1)',
                }}
              >
                <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>

            <div className="flex items-center">
              {([
                { id: 'workout' as const, label: 'Workout', icon: ClipboardCheck },
                { id: 'profile' as const, label: 'Profile', icon: User },
              ] as NI[]).map(t => <Tab key={t.id} item={t} isActive={activeView === t.id} />)}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
