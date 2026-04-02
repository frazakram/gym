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
  Ruler,
} from 'lucide-react'

interface BottomNavProps {
  activeView: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements'
  onViewChange: (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements') => void
}

// Arc config
const ARC_RADIUS = 105
const ICON_SIZE = 56 // w-14 h-14

const MENU_ITEMS = [
  {
    id: 'analytics' as const,
    label: 'Analytics',
    icon: BarChart3,
    color: '#A78BFA',
    bg: 'rgba(139,92,246,0.18)',
    border: 'rgba(139,92,246,0.35)',
    angle: 155,
  },
  {
    id: 'diet' as const,
    label: 'Diet',
    icon: Utensils,
    color: '#6EE7B7',
    bg: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.35)',
    angle: 115,
  },
  {
    id: 'coach' as const,
    label: 'Coach',
    icon: MessageCircle,
    color: '#FCD34D',
    bg: 'rgba(245,158,11,0.18)',
    border: 'rgba(245,158,11,0.35)',
    angle: 65,
  },
  {
    id: 'measurements' as const,
    label: 'Body',
    icon: Ruler,
    color: '#67E8F9',
    bg: 'rgba(34,211,238,0.18)',
    border: 'rgba(34,211,238,0.35)',
    angle: 25,
  },
]

function getArcXY(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: Math.cos(rad) * ARC_RADIUS - ICON_SIZE / 2,
    y: -Math.sin(rad) * ARC_RADIUS - ICON_SIZE / 2,
  }
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const [open, setOpen] = useState(false)

  const handleItemClick = (id: typeof activeView) => {
    onViewChange(id)
    setOpen(false)
  }

  type NavItem = { id: 'home' | 'routine' | 'workout' | 'profile'; label: string; icon: React.ComponentType<{ className?: string }> }

  const NavButton = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
    const Icon = item.icon
    return (
      <button
        onClick={() => handleItemClick(item.id)}
        className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]"
      >
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
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-lg"
            style={{ zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Radial arc menu ── */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed pointer-events-none"
            style={{
              zIndex: 50,
              bottom: 36,          // vertically centered on FAB
              left: '50%',
              width: 0,
              height: 0,
            }}
          >
            {/* Dashed arc guide line */}
            <motion.svg
              width="280"
              height="170"
              viewBox="-140 -170 280 170"
              fill="none"
              className="absolute left-1/2 bottom-0 -translate-x-1/2 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.path
                d={`M ${Math.cos((160 * Math.PI) / 180) * ARC_RADIUS} ${-Math.sin((160 * Math.PI) / 180) * ARC_RADIUS} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${Math.cos((20 * Math.PI) / 180) * ARC_RADIUS} ${-Math.sin((20 * Math.PI) / 180) * ARC_RADIUS}`}
                stroke="rgba(139,92,246,0.12)"
                strokeWidth="1"
                strokeDasharray="3 5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </motion.svg>

            {/* Arc items — each orbits out from center */}
            {MENU_ITEMS.map((item, i) => {
              const { x, y } = getArcXY(item.angle)
              const Icon = item.icon
              const isActive = activeView === item.id
              return (
                <motion.div
                  key={item.id}
                  className="absolute pointer-events-auto"
                  style={{ bottom: 0, left: 0 }}
                  initial={{ x: -ICON_SIZE / 2, y: -ICON_SIZE / 2, scale: 0, opacity: 0 }}
                  animate={{ x, y, scale: 1, opacity: 1 }}
                  exit={{
                    x: -ICON_SIZE / 2,
                    y: -ICON_SIZE / 2,
                    scale: 0,
                    opacity: 0,
                    transition: { delay: (MENU_ITEMS.length - 1 - i) * 0.04, duration: 0.2 },
                  }}
                  transition={{
                    delay: i * 0.07,
                    type: 'spring',
                    stiffness: 380,
                    damping: 20,
                  }}
                >
                  {/* Floating label */}
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 + 0.25, duration: 0.2 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-lg backdrop-blur-md"
                    style={{
                      color: item.color,
                      background: item.bg,
                      border: `1px solid ${item.border}`,
                      boxShadow: `0 2px 12px ${item.bg}`,
                    }}
                  >
                    {item.label}
                  </motion.span>

                  {/* Circular icon button */}
                  <motion.button
                    onClick={() => handleItemClick(item.id)}
                    whileHover={{ scale: 1.18 }}
                    whileTap={{ scale: 0.88 }}
                    className="relative flex items-center justify-center rounded-full backdrop-blur-xl"
                    style={{
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      background: item.bg,
                      border: `1.5px solid ${item.border}`,
                      boxShadow: `0 0 28px ${item.bg}, 0 0 12px ${item.border}, 0 6px 20px rgba(0,0,0,0.35)`,
                    }}
                  >
                    {/* Active ring */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-[-3px] rounded-full"
                        style={{ border: `2px solid ${item.color}`, boxShadow: `0 0 14px ${item.border}` }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      />
                    )}
                    <Icon style={{ color: item.color, width: 22, height: 22 }} />
                  </motion.button>
                </motion.div>
              )
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ── Bottom Nav Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 safe-area-bottom" style={{ zIndex: 50 }}>
        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="flex items-center justify-between bg-[#0A0A14]/95 backdrop-blur-xl rounded-2xl border border-[#8B5CF6]/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-2 py-1">
            {/* Left */}
            <div className="flex items-center">
              {([
                { id: 'home' as const, label: 'Home', icon: Home },
                { id: 'routine' as const, label: 'Routine', icon: Calendar },
              ] as NavItem[]).map((item) => (
                <NavButton key={item.id} item={item} isActive={activeView === item.id} />
              ))}
            </div>

            {/* FAB */}
            <div className="relative -mt-6">
              {/* Ripple rings when open */}
              <AnimatePresence>
                {open && (
                  <>
                    <motion.div
                      key="ring1"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2.6, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 }}
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)' }}
                    />
                    <motion.div
                      key="ring2"
                      initial={{ scale: 1, opacity: 0.3 }}
                      animate={{ scale: 2, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.6, delay: 0.3 }}
                      className="absolute inset-0 rounded-full bg-[#22D3EE]/20"
                    />
                  </>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => setOpen(v => !v)}
                whileTap={{ scale: 0.82 }}
                animate={{
                  scale: open ? 1.18 : 1,
                  rotate: open ? 45 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#22D3EE] transition-shadow duration-300"
                style={{
                  boxShadow: open
                    ? '0 0 32px rgba(139,92,246,0.6), 0 0 64px rgba(34,211,238,0.25), 0 0 96px rgba(139,92,246,0.12)'
                    : '0 4px 24px rgba(139,92,246,0.4), 0 0 40px rgba(34,211,238,0.1)',
                }}
              >
                <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Right */}
            <div className="flex items-center">
              {([
                { id: 'workout' as const, label: 'Workout', icon: ClipboardCheck },
                { id: 'profile' as const, label: 'Profile', icon: User },
              ] as NavItem[]).map((item) => (
                <NavButton key={item.id} item={item} isActive={activeView === item.id} />
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
