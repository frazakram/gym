'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Calendar, ClipboardCheck, User, Plus,
  Utensils, MessageCircle, Ruler, Users, Zap, MapPin,
} from 'lucide-react'
import { csrfFetch } from '@/lib/useCsrf'
import { GymNearbySheet } from '@/components/ui/GymNearbySheet'

type View = 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements' | 'communities'

interface BottomNavProps {
  activeView: View
  onViewChange: (view: View) => void
  gymSheetOpen?: boolean
  onGymSheetChange?: (open: boolean) => void
  onGymSaved?: () => void
}

type NI = { id: 'home' | 'routine' | 'workout' | 'profile'; label: string; icon: React.ComponentType<{ className?: string }> }

const MENU_ITEMS: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'diet',         label: 'Diet',      icon: Utensils      },
  { id: 'communities',  label: 'Community', icon: Users         },
  { id: 'measurements', label: 'Body',      icon: Ruler         },
  { id: 'coach',        label: 'Coach',     icon: MessageCircle },
]

export function BottomNav({ activeView, onViewChange, gymSheetOpen, onGymSheetChange, onGymSaved }: BottomNavProps) {
  const [open, setOpen] = useState(false)
  const [localGymSheet, setLocalGymSheet] = useState(false)
  const showGymSheet = gymSheetOpen ?? localGymSheet
  const setShowGymSheet = onGymSheetChange ?? setLocalGymSheet
  const pick = (id: View) => { onViewChange(id); setOpen(false) }

  const [totalXp, setTotalXp] = useState<number | null>(null)
  useEffect(() => {
    csrfFetch('/api/xp')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.total_xp != null) setTotalXp(d.total_xp) })
      .catch(() => {})
  }, [])

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

  return (
    <>
      {/* Backdrop — subtle, not heavy */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating action bar */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="action-bar"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="fixed left-1/2 -translate-x-1/2 z-50"
            style={{
              bottom: '86px',
              width: 'calc(100% - 32px)',
              maxWidth: '440px',
            }}
          >
            {/* Bar */}
            <div
              className="rounded-2xl border border-white/[0.07] overflow-hidden"
              style={{
                background: 'rgba(8, 10, 20, 0.94)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                boxShadow:
                  '0 0 0 1px rgba(139,92,246,0.12), 0 -4px 32px rgba(0,0,0,0.4), 0 16px 48px rgba(0,0,0,0.5)',
              }}
            >
            <div className="flex items-stretch justify-around">
              {MENU_ITEMS.map((item, i) => {
                const Icon = item.icon
                const isActive = activeView === item.id
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => pick(item.id)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.045, duration: 0.22, ease: 'easeOut' }}
                    whileHover={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
                    whileTap={{ scale: 0.93 }}
                    className="relative flex flex-col items-center justify-center gap-1.5 flex-1 py-3.5 px-1 transition-colors duration-150"
                  >
                    {/* Active highlight */}
                    {isActive && (
                      <motion.div
                        layoutId="bar-active-bg"
                        className="absolute inset-0"
                        style={{ background: 'rgba(124,58,237,0.13)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Divider between items (skip first) */}
                    {i > 0 && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-6"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      />
                    )}

                    <div
                      className="relative z-10 transition-all duration-200"
                      style={{
                        color: isActive ? '#a78bfa' : 'rgba(148,163,184,0.7)',
                        filter: isActive ? 'drop-shadow(0 0 7px rgba(167,139,250,0.55))' : 'none',
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <span
                      className="relative z-10 text-[10px] font-medium tracking-wide whitespace-nowrap transition-colors duration-200"
                      style={{ color: isActive ? '#c4b5fd' : 'rgba(100,116,139,0.9)' }}
                    >
                      {item.label}
                    </span>

                    {/* Active indicator: thin line at top of the bar item */}
                    {isActive && (
                      <motion.span
                        layoutId="bar-active-line"
                        className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, #7c3aed, #a78bfa, transparent)',
                          boxShadow: '0 0 8px rgba(124,58,237,0.7)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>

              {/* Find gym nearby */}
              <div className="border-t border-white/[0.06]">
                <motion.button
                  onClick={() => { setOpen(false); setShowGymSheet(true) }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: MENU_ITEMS.length * 0.045, duration: 0.22, ease: 'easeOut' }}
                  whileHover={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 transition-colors duration-150"
                >
                  <MapPin className="w-4 h-4" style={{ color: 'rgba(148,163,184,0.8)' }} />
                  <span className="text-[11px] font-medium tracking-wide" style={{ color: 'rgba(148,163,184,0.8)' }}>
                    Find gym nearby
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Connector taper to FAB */}
            <div className="flex justify-center">
              <svg width="40" height="10" viewBox="0 0 40 10" fill="none">
                <path d="M20 10 L8 0 L32 0 Z" fill="rgba(8,10,20,0.94)" />
                <line x1="8" y1="0" x2="20" y2="10" stroke="rgba(139,92,246,0.15)" strokeWidth="1" />
                <line x1="32" y1="0" x2="20" y2="10" stroke="rgba(139,92,246,0.15)" strokeWidth="1" />
              </svg>
            </div>
          </motion.div>
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
              {/* XP pill — floats above the FAB */}
              <AnimatePresence>
                {totalXp != null && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none select-none"
                    style={{
                      background: 'rgba(124,58,237,0.18)',
                      border: '1px solid rgba(167,139,250,0.35)',
                      boxShadow: '0 0 10px rgba(124,58,237,0.25)',
                    }}
                  >
                    <Zap className="w-2.5 h-2.5 text-violet-300" />
                    <span className="text-[10px] font-semibold text-violet-200 tracking-wide">
                      {totalXp.toLocaleString('en-IN')} XP
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => setOpen(v => !v)}
                whileTap={{ scale: 0.86 }}
                animate={{ rotate: open ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 480, damping: 26 }}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary-dark to-brand-cyan"
                style={{
                  boxShadow: open
                    ? '0 0 0 5px rgba(139,92,246,0.2), 0 0 28px rgba(139,92,246,0.6)'
                    : '0 4px 20px rgba(139,92,246,0.45), 0 0 36px rgba(34,211,238,0.08)',
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

      {/* Gym nearby sheet */}
      <GymNearbySheet open={showGymSheet} onClose={() => setShowGymSheet(false)} onGymSaved={onGymSaved} />
    </>
  )
}
