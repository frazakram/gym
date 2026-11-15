'use client'

import { useCallback, useState } from 'react'
import { csrfFetch } from '@/lib/useCsrf'
import type { PremiumStatus } from '@/types'

/** Billing / premium status for the signed-in user. */
export function usePremiumStatus() {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null)

  /** Reloads the status; returns it, or null if the request failed (state unchanged). */
  const fetchPremiumStatus = useCallback(async (): Promise<PremiumStatus | null> => {
    try {
      const res = await csrfFetch('/api/billing/status', { cache: 'no-store' })
      if (!res.ok) return null
      const data = (await res.json()) as PremiumStatus
      setPremiumStatus(data)
      return data
    } catch {
      return null
    }
  }, [])

  return { premiumStatus, setPremiumStatus, fetchPremiumStatus }
}
