'use client'

import { useState, type ComponentType } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Dumbbell, Home, User, Utensils } from 'lucide-react'
import { GymNearbySheet } from '@/components/ui/GymNearbySheet'

export type DashboardView =
  | 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics'
  | 'coach' | 'measurements' | 'communities' | 'nutrition' | 'progress'

interface BottomNavProps {
  activeView: DashboardView
  onViewChange: (view: DashboardView) => void
  gymSheetOpen?: boolean
  onGymSheetChange?: (open: boolean) => void
  onGymSaved?: () => void
}

type Tab = { view: DashboardView; label: string; icon: ComponentType<{ 'aria-hidden'?: boolean }>; owns: DashboardView[] }

/** The four tabs of the Navy and Pink design; each also owns the screens opened from it. */
export const TABS: Tab[] = [
  { view: 'home', label: 'Today', icon: Home, owns: ['home'] },
  { view: 'routine', label: 'Train', icon: Dumbbell, owns: ['routine', 'workout'] },
  { view: 'nutrition', label: 'Eat', icon: Utensils, owns: ['nutrition', 'diet'] },
  { view: 'profile', label: 'Profile', icon: User, owns: ['profile', 'progress', 'analytics', 'measurements', 'coach', 'communities'] },
]

export function tabFor(view: DashboardView): Tab {
  return TABS.find((t) => t.owns.includes(view)) ?? TABS[0]
}

export function BottomNav({ activeView, onViewChange, gymSheetOpen, onGymSheetChange, onGymSaved }: BottomNavProps) {
  const [localGymSheet, setLocalGymSheet] = useState(false)
  const showGymSheet = gymSheetOpen ?? localGymSheet
  const setShowGymSheet = onGymSheetChange ?? setLocalGymSheet
  const reduceMotion = useReducedMotion()
  const current = tabFor(activeView)

  return (
    <>
      <nav className="gb-tabbar-wrap" aria-label="Main">
        <div className="gb-tabbar">
          <div className="gb-tabbar-row gb-tabbar-row-4">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isCurrent = tab === current
              return (
                <button
                  key={tab.view}
                  type="button"
                  onClick={() => onViewChange(tab.view)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className="gb-tab gb-press"
                >
                  <span className="gb-tab-icon">
                    {isCurrent && (
                      <motion.span layoutId="gb-tab-ind" className="gb-tab-ind" transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }} />
                    )}
                    <Icon aria-hidden />
                  </span>
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <GymNearbySheet open={showGymSheet} onClose={() => setShowGymSheet(false)} onGymSaved={onGymSaved} />
    </>
  )
}
