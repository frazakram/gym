'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  /** Pull distance in px before triggering refresh (default: 80) */
  threshold?: number
  /** Resistance factor — higher = slower pull (default: 2.5) */
  resistance?: number
  /** Disable the hook entirely, e.g. while generating (default: true) */
  enabled?: boolean
}

interface UsePullToRefreshResult {
  pullDistance: number
  isRefreshing: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const touchStartY = useRef(0)
  const isPulling = useRef(false)
  const isRefreshingRef = useRef(false)
  const pullDistanceRef = useRef(0)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshingRef.current) return
      // Only start if the page is scrolled to the very top
      if (window.scrollY > 0) return
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
    },
    [enabled],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || isRefreshingRef.current) return

      // Abort if the user has scrolled down during this gesture
      if (window.scrollY > 0) {
        isPulling.current = false
        pullDistanceRef.current = 0
        setPullDistance(0)
        return
      }

      const delta = e.touches[0].clientY - touchStartY.current
      if (delta <= 0) {
        pullDistanceRef.current = 0
        setPullDistance(0)
        return
      }

      // Block browser native overscroll / chrome pull-to-refresh
      e.preventDefault()

      const clamped = Math.min(delta / resistance, threshold * 1.5)
      pullDistanceRef.current = clamped
      setPullDistance(clamped)
    },
    [resistance, threshold],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return
    isPulling.current = false

    const dist = pullDistanceRef.current

    if (dist >= threshold && !isRefreshingRef.current) {
      isRefreshingRef.current = true
      setIsRefreshing(true)
      // Snap the indicator to the threshold position while refreshing
      pullDistanceRef.current = threshold
      setPullDistance(threshold)

      try {
        await onRefresh()
      } finally {
        isRefreshingRef.current = false
        setIsRefreshing(false)
        pullDistanceRef.current = 0
        setPullDistance(0)
      }
    } else {
      pullDistanceRef.current = 0
      setPullDistance(0)
    }
  }, [threshold, onRefresh])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    // Must be non-passive so we can call e.preventDefault() to block native overscroll
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return { pullDistance, isRefreshing }
}
