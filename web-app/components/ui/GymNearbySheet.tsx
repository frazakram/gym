'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, MapPin, Search, Loader2, Star, Dumbbell,
  CheckCircle, Plus, ChevronRight, Sparkles,
} from 'lucide-react'
import { getUserLocation, LocationResult } from '@/lib/location'
import { csrfFetch } from '@/lib/useCsrf'

interface GymNearbySheetProps {
  open: boolean
  onClose: () => void
  onGymSaved?: () => void
}

interface GymResult {
  placeId: string
  name: string
  address: string
  imageUrl: string | null
  rating: number | null
}

type Screen = 'search' | 'results' | 'confirm' | 'saved'

const slideLeft = {
  initial: { x: 40, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { x: -40, opacity: 0, transition: { duration: 0.15 } },
}

export function GymNearbySheet({ open, onClose, onGymSaved }: GymNearbySheetProps) {
  const [screen, setScreen] = useState<Screen>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GymResult[]>([])
  const [searching, setSearching] = useState(false)
  const [location, setLocation] = useState<LocationResult | null>(null)

  // Confirm screen state
  const [selectedGym, setSelectedGym] = useState<GymResult | null>(null)
  const [equipment, setEquipment] = useState<string[]>([])
  const [disabledEquipment, setDisabledEquipment] = useState<Set<string>>(new Set())
  const [newEquipment, setNewEquipment] = useState('')
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [noPhoto, setNoPhoto] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On open: get precise location then immediately search for nearby gyms
  useEffect(() => {
    if (!open) return
    setScreen('search')
    setQuery('')
    setResults([])
    setSelectedGym(null)
    setEquipment([])
    setDisabledEquipment(new Set())
    setNoPhoto(false)
    setSearching(true)

    let cancelled = false
    getUserLocation(8000)
      .then(async (loc) => {
        if (cancelled) return
        if (loc.source !== 'denied' && loc.source !== 'unavailable') {
          setLocation(loc)
          // Auto-search using precise coordinates — no manual input needed
          try {
            const params = new URLSearchParams({ q: 'gym', lat: String(loc.lat), lng: String(loc.lng) })
            const res = await csrfFetch(`/api/gym/search?${params.toString()}`)
            if (!cancelled && res.ok) {
              const data = await res.json()
              const gyms = data.results || []
              if (gyms.length > 0) {
                setResults(gyms)
                setScreen('results')
              }
            }
          } catch {
            // fall through to manual search
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSearching(false) })
    return () => { cancelled = true }
  }, [open])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const params = new URLSearchParams({ q })
      if (location) {
        params.set('lat', String(location.lat))
        params.set('lng', String(location.lng))
      }
      const res = await csrfFetch(`/api/gym/search?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
        if ((data.results || []).length > 0) setScreen('results')
      }
    } catch {
      // silent
    } finally {
      setSearching(false)
    }
  }, [location])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 500)
  }

  // Select gym → scan equipment
  const handleSelectGym = async (gym: GymResult) => {
    setSelectedGym(gym)
    if (!gym.imageUrl) {
      setNoPhoto(true)
      setEquipment([])
      setScreen('confirm')
      return
    }
    setNoPhoto(false)
    setScanning(true)
    setScreen('confirm')
    try {
      const res = await csrfFetch('/api/gym/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: gym.imageUrl }),
      })
      if (res.ok) {
        const data = await res.json()
        setEquipment(data.analysis?.equipment_detected || [])
      } else {
        setEquipment([])
      }
    } catch {
      setEquipment([])
    } finally {
      setScanning(false)
    }
  }

  const toggleEquipment = (item: string) => {
    setDisabledEquipment((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  const addManualEquipment = () => {
    const trimmed = newEquipment.trim()
    if (!trimmed || equipment.includes(trimmed)) return
    setEquipment((prev) => [...prev, trimmed])
    setNewEquipment('')
  }

  const handleSave = async () => {
    if (!selectedGym) return
    setSaving(true)
    try {
      const finalEquipment = equipment.filter((e) => !disabledEquipment.has(e))
      await csrfFetch('/api/gym/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: selectedGym.name,
          placeId: selectedGym.placeId,
          imageUrl: selectedGym.imageUrl,
          equipment: finalEquipment,
          location: selectedGym.address,
        }),
      })
      setScreen('saved')
      onGymSaved?.()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (!selectedGym) return
    setSaving(true)
    try {
      await csrfFetch('/api/gym/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: selectedGym.name,
          placeId: selectedGym.placeId,
          imageUrl: selectedGym.imageUrl,
          equipment: [],
          location: selectedGym.address,
        }),
      })
      setScreen('saved')
      onGymSaved?.()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const screenTitle: Record<Screen, string> = {
    search: 'Find Your Gym',
    results: 'Select Your Gym',
    confirm: 'Confirm Equipment',
    saved: 'Gym Saved',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="gym-backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="gym-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 max-w-screen-md mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            <div
              className="rounded-t-3xl border border-primary/15 px-5 pt-4 pb-10 max-h-[85vh] overflow-y-auto"
              style={{ background: 'rgba(16, 16, 30, 0.98)', backdropFilter: 'blur(24px)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-light" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{screenTitle[screen]}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {screen === 'search' && (searching ? 'Detecting your location...' : 'Search by name')}
                      {screen === 'results' && `${results.length} gyms near you`}
                      {screen === 'confirm' && (selectedGym?.name || '')}
                      {screen === 'saved' && 'Equipment synced'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/12 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Screen content */}
              <AnimatePresence mode="wait">
                {/* ─── SCREEN 1: SEARCH ─── */}
                {screen === 'search' && (
                  <motion.div key="search" {...slideLeft}>
                    {/* Auto-detecting location */}
                    {searching && (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <Loader2 className="w-7 h-7 text-primary-light animate-spin" />
                        <p className="text-sm text-white/80">Finding gyms near you...</p>
                        <p className="text-xs text-muted">Using your precise location</p>
                      </div>
                    )}

                    {/* Manual search fallback (shown after auto-search completes or location denied) */}
                    {!searching && (
                      <>
                        <p className="text-xs text-muted mb-3">
                          {location ? 'No results found nearby — search by name:' : 'Location unavailable — search by name:'}
                        </p>
                        <div className="relative mb-4">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                          <input
                            type="text"
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            placeholder="Search your gym..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/6 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40 transition-colors"
                            autoFocus
                          />
                          {searching && (
                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-light animate-spin" />
                          )}
                        </div>
                        {query.length > 0 && query.length < 2 && (
                          <p className="text-xs text-muted text-center">Type at least 2 characters</p>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {/* ─── SCREEN 2: RESULTS ─── */}
                {screen === 'results' && (
                  <motion.div key="results" {...slideLeft}>
                    {/* Search by name instead */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        placeholder="Refine search..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/30 transition-colors"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-light animate-spin" />
                      )}
                    </div>

                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {results.map((gym) => (
                        <button
                          key={gym.placeId}
                          type="button"
                          onClick={() => handleSelectGym(gym)}
                          className="w-full flex items-center gap-3 rounded-2xl bg-white/4 border border-white/6 px-3 py-3 hover:bg-white/8 active:scale-[0.98] transition-all text-left group"
                        >
                          {/* Image or placeholder */}
                          <div className="w-14 h-14 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {gym.imageUrl ? (
                              <img
                                src={gym.imageUrl}
                                alt={gym.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <Dumbbell className="w-6 h-6 text-white/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{gym.name}</p>
                            <p className="text-xs text-muted truncate mt-0.5">{gym.address}</p>
                            {gym.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-xs text-amber-300">{gym.rating}</span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ─── SCREEN 3: CONFIRM EQUIPMENT ─── */}
                {screen === 'confirm' && selectedGym && (
                  <motion.div key="confirm" {...slideLeft}>
                    {/* Back */}
                    <button
                      type="button"
                      onClick={() => setScreen('results')}
                      className="text-xs text-primary-light mb-3 hover:underline"
                    >
                      &larr; Back to results
                    </button>

                    {/* Gym info card */}
                    <div className="rounded-2xl bg-white/4 border border-white/8 p-3 mb-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {selectedGym.imageUrl ? (
                          <img src={selectedGym.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Dumbbell className="w-5 h-5 text-white/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{selectedGym.name}</p>
                        <p className="text-xs text-muted truncate">{selectedGym.address}</p>
                      </div>
                      {!noPhoto && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] text-emerald-300">Photo loaded</span>
                        </div>
                      )}
                    </div>

                    {/* Scanning state */}
                    {scanning && (
                      <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-4 mb-4 flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-primary-light animate-spin shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white">Scanning equipment...</p>
                          <p className="text-xs text-muted mt-0.5">AI is analyzing the gym photo</p>
                        </div>
                      </div>
                    )}

                    {/* Equipment list */}
                    {!scanning && (
                      <>
                        {noPhoto && (
                          <p className="text-xs text-muted mb-3">
                            No photo available — add equipment manually below
                          </p>
                        )}

                        {equipment.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-muted font-medium mb-2">
                              Detected equipment (tap to deselect):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {equipment.map((item) => {
                                const disabled = disabledEquipment.has(item)
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => toggleEquipment(item)}
                                    className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                                      disabled
                                        ? 'bg-white/4 text-white/30 border border-white/6 line-through'
                                        : 'bg-primary/15 text-primary-light border border-primary/25'
                                    }`}
                                  >
                                    {item}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add manual equipment */}
                        <div className="flex gap-2 mb-5">
                          <input
                            type="text"
                            value={newEquipment}
                            onChange={(e) => setNewEquipment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addManualEquipment()}
                            placeholder="Add equipment..."
                            className="flex-1 px-3 py-2 rounded-xl bg-white/6 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/30"
                          />
                          <button
                            type="button"
                            onClick={addManualEquipment}
                            disabled={!newEquipment.trim()}
                            className="px-3 py-2 rounded-xl bg-primary/15 border border-primary/25 text-xs font-medium text-primary-light disabled:opacity-30 hover:bg-primary/20 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            {saving ? 'Saving...' : 'Confirm & Save'}
                          </button>
                          <button
                            type="button"
                            onClick={handleSkip}
                            disabled={saving}
                            className="w-full py-2.5 rounded-xl bg-white/6 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 transition-all disabled:opacity-50"
                          >
                            Skip for now
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* ─── SCREEN 4: SAVED ─── */}
                {screen === 'saved' && selectedGym && (
                  <motion.div
                    key="saved"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="text-center py-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4"
                    >
                      <Sparkles className="w-7 h-7 text-emerald-400" />
                    </motion.div>

                    <p className="text-lg font-semibold text-white mb-2">Gym saved!</p>
                    <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                      Your routines will now be tailored to <span className="text-white font-medium">{selectedGym.name}</span>&apos;s equipment
                    </p>

                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-6 px-8 py-2.5 rounded-xl bg-primary/15 border border-primary/25 text-sm font-medium text-primary-light hover:bg-primary/20 transition-all"
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
