'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { csrfFetch } from '@/lib/useCsrf'
import { getUserLocation, LocationResult, reverseGeocode } from '@/lib/location'

export type UseLocationOptions = {
  autoSave?: boolean
  onDetected?: (loc: LocationResult) => void
}

export type UseLocationReturn = {
  location: LocationResult | null
  city: string | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const { autoSave = true, onDetected } = options

  const [location, setLocation] = useState<LocationResult | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const loc = await getUserLocation()
        if (cancelled) return
        setLocation(loc)
        onDetectedRef.current?.(loc)

        if (loc.source === 'denied' || loc.source === 'unavailable') {
          setLoading(false)
          return
        }

        let resolvedCity: string | null = null
        let resolvedCountry: string | null = null
        try {
          const geo = await reverseGeocode(loc.lat, loc.lng)
          resolvedCity = geo.city
          resolvedCountry = geo.countryCode
        } catch {
          resolvedCity = null
          resolvedCountry = null
        }
        if (cancelled) return
        setCity(resolvedCity)

        if (autoSave) {
          try {
            await csrfFetch('/api/user-location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: loc.lat,
                lng: loc.lng,
                city: resolvedCity ?? undefined,
                country: resolvedCountry ?? undefined,
                source: loc.source,
              }),
            })
          } catch (e) {
            if (!cancelled) {
              setError(e instanceof Error ? e.message : 'Failed to save location')
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Location detection failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [autoSave, tick])

  return { location, city, loading, error, refresh }
}
