export type LocationResult = {
  lat: number
  lng: number
  source: 'native' | 'browser' | 'denied' | 'unavailable'
  accuracy?: number
}

declare global {
  interface Window {
    __nativeLocation?: { lat: number; lng: number; accuracy?: number }
    Android?: { getLocation?: () => string }
  }
}

export function isValidCoord(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  )
}

function readNativeInjected(): LocationResult | null {
  if (typeof window === 'undefined') return null
  const n = window.__nativeLocation
  if (!n) return null
  if (!isValidCoord(n.lat, n.lng)) return null
  return { lat: n.lat, lng: n.lng, source: 'native', accuracy: n.accuracy }
}

function readNativeBridge(): LocationResult | null {
  if (typeof window === 'undefined') return null
  const fn = window.Android?.getLocation
  if (typeof fn !== 'function') return null
  try {
    const raw = fn()
    if (!raw) return null
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number; accuracy?: number }
    if (parsed?.lat == null || parsed?.lng == null) return null
    if (!isValidCoord(parsed.lat, parsed.lng)) return null
    return { lat: parsed.lat, lng: parsed.lng, source: 'native', accuracy: parsed.accuracy }
  } catch {
    return null
  }
}

function readBrowser(timeoutMs: number): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ lat: 0, lng: 0, source: 'unavailable' })
      return
    }

    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve({ lat: 0, lng: 0, source: 'unavailable' })
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const { latitude, longitude, accuracy } = pos.coords
        if (!isValidCoord(latitude, longitude)) {
          resolve({ lat: 0, lng: 0, source: 'unavailable' })
          return
        }
        resolve({ lat: latitude, lng: longitude, source: 'browser', accuracy })
      },
      (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (err && err.code === err.PERMISSION_DENIED) {
          resolve({ lat: 0, lng: 0, source: 'denied' })
        } else {
          resolve({ lat: 0, lng: 0, source: 'unavailable' })
        }
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: timeoutMs },
    )
  })
}

export async function getUserLocation(timeoutMs = 6000): Promise<LocationResult> {
  const injected = readNativeInjected()
  if (injected) return injected

  const bridge = readNativeBridge()
  if (bridge) return bridge

  const browser = await readBrowser(timeoutMs)
  if (browser.source === 'browser') return browser

  if (browser.source === 'denied') return browser

  return { lat: 0, lng: 0, source: 'unavailable' }
}

export type ReverseGeocode = { city: string | null; countryCode: string | null }

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocode> {
  if (!isValidCoord(lat, lng)) return { city: null, countryCode: null }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(String(lng))}&zoom=10&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GymBroApp/1.0', Accept: 'application/json' },
    })
    if (!res.ok) return { city: null, countryCode: null }
    const data: { address?: Record<string, string> } = await res.json()
    const addr = data?.address || {}
    const city =
      addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.county || null
    const cc = addr.country_code ? addr.country_code.toUpperCase() : null
    return {
      city: typeof city === 'string' && city.trim().length > 0 ? city.trim() : null,
      countryCode: cc && /^[A-Z]{2}$/.test(cc) ? cc : null,
    }
  } catch {
    return { city: null, countryCode: null }
  }
}

export async function getCityFromCoords(lat: number, lng: number): Promise<string | null> {
  return (await reverseGeocode(lat, lng)).city
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // km
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
