'use client'

import { useState } from 'react'
import { useReducedMotion, type Variants } from 'framer-motion'

/** Left-to-right order: Today, Train (routine, workout), Eat (food log, meal plan), Profile and the screens opened from it. */
const VIEW_ORDER = ['home', 'routine', 'workout', 'nutrition', 'diet', 'profile', 'progress', 'analytics', 'measurements', 'coach', 'communities']

const SLIDE_PX = 28

/** Screens slide in from the side you are moving towards (1 = forward, -1 = back). */
export const viewSlideVariants: Variants = {
  enter: (dx: number) => ({ opacity: 0, x: dx }),
  center: { opacity: 1, x: 0 },
  exit: (dx: number) => ({ opacity: 0, x: -dx }),
}

/**
 * The slide offset for the current screen change: positive when moving to a
 * screen further right, negative when going back, 0 under reduced motion.
 */
export function useViewSlide(view: string): number {
  const reduceMotion = useReducedMotion()
  const [last, setLast] = useState({ view, direction: 1 })
  let direction = last.direction
  if (last.view !== view) {
    direction = VIEW_ORDER.indexOf(view) >= VIEW_ORDER.indexOf(last.view) ? 1 : -1
    setLast({ view, direction }) // derived state: React re-renders before painting
  }
  return reduceMotion ? 0 : direction * SLIDE_PX
}
