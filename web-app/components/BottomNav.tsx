'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Home, Calendar, ClipboardCheck, User, Plus,
  Utensils, MessageCircle, Ruler, Users, Zap, MapPin, Apple,
} from 'lucide-react'
import { csrfFetch } from '@/lib/useCsrf'
import { GymNearbySheet } from '@/components/ui/GymNearbySheet'

type View = 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements' | 'communities' | 'nutrition'

interface BottomNavProps {
  activeView: View
  onViewChange: (view: View) => void
  gymSheetOpen?: boolean
  onGymSheetChange?: (open: boolean) => void
  onGymSaved?: () => void
}

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
type TabItem = { id: 'home' | 'routine' | 'workout' | 'profile'; label: string; icon: Icon }

const LEFT_TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'routine', label: 'Routine', icon: Calendar },
]
const RIGHT_TABS: TabItem[] = [
  { id: 'workout', label: 'Workout', icon: ClipboardCheck },
  { id: 'profile', label: 'Profile', icon: User },
]

const MENU_ITEMS: { id: View; label: string; icon: Icon; tint: 'pink' | 'peach' | 'lav' | 'mint' }[] = [
  { id: 'nutrition',    label: 'Nutrition', icon: Apple,         tint: 'peach' },
  { id: 'diet',         label: 'Diet',      icon: Utensils,      tint: 'mint'  },
  { id: 'communities',  label: 'Community', icon: Users,         tint: 'lav'   },
  { id: 'measurements', label: 'Body',      icon: Ruler,         tint: 'pink'  },
  { id: 'coach',        label: 'Coach',     icon: MessageCircle, tint: 'lav'   },
]

export function BottomNav({ activeView, onViewChange, gymSheetOpen, onGymSheetChange, onGymSaved }: BottomNavProps) {
  const [open, setOpen] = useState(false)
  const [localGymSheet, setLocalGymSheet] = useState(false)
  const showGymSheet = gymSheetOpen ?? localGymSheet
  const setShowGymSheet = onGymSheetChange ?? setLocalGymSheet
  const reduceMotion = useReducedMotion()
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 32 }
  const pick = (id: View) => { onViewChange(id); setOpen(false) }

  const [totalXp, setTotalXp] = useState<number | null>(null)
  useEffect(() => {
    csrfFetch('/api/xp')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.total_xp != null) setTotalXp(d.total_xp) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const renderTab = (item: TabItem) => {
    const Icon = item.icon
    const isActive = activeView === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => pick(item.id)}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        className="gb-tab gb-press"
      >
        <span className="gb-tab-icon">
          {isActive && <motion.span layoutId="gb-tab-ind" className="gb-tab-ind" transition={spring} />}
          <Icon aria-hidden />
        </span>
        {item.label}
      </button>
    )
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            className="gb-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            className="gb-menu"
            initial={{ opacity: 0, y: 16, x: '-50%', scale: 0.97 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 12, x: '-50%', scale: 0.97 }}
            transition={spring}
          >
            <div className="gb-menu-grid">
              {MENU_ITEMS.map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => pick(item.id)}
                    aria-current={activeView === item.id ? 'page' : undefined}
                    className="gb-menu-item gb-press"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { delay: i * 0.04, duration: 0.22, ease: 'easeOut' }}
                  >
                    <span className={`gb-chip gb-tint-${item.tint}`} aria-hidden="true"><Icon aria-hidden /></span>
                    {item.label}
                  </motion.button>
                )
              })}
            </div>
            <div className="gb-menu-foot">
              <button type="button" className="gb-press" onClick={() => { setOpen(false); setShowGymSheet(true) }}>
                <MapPin aria-hidden="true" />Find gym nearby
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="gb-tabbar-wrap" aria-label="Main">
        <div className="gb-tabbar">
          <div className="gb-tabbar-row">
            {LEFT_TABS.map(renderTab)}
            <div className="gb-fab-slot">
              {totalXp != null && (
                <span className="gb-xp gb-num"><Zap aria-hidden="true" />{totalXp.toLocaleString('en-IN')} XP</span>
              )}
              <motion.button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                className="gb-fab"
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                animate={{ rotate: open ? 45 : 0 }}
                transition={spring}
              >
                <Plus strokeWidth={2.5} aria-hidden="true" />
              </motion.button>
            </div>
            {RIGHT_TABS.map(renderTab)}
          </div>
        </div>
      </nav>

      <GymNearbySheet open={showGymSheet} onClose={() => setShowGymSheet(false)} onGymSaved={onGymSaved} />
    </>
  )
}
