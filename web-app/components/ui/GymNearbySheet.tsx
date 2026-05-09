'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, MapPin, Search, Loader2, Dumbbell,
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

const EQUIPMENT_PRESETS: { category: string; items: string[] }[] = [
  {
    category: 'Free Weights',
    items: ['Dumbbells', 'Barbell', 'EZ Bar', 'Kettlebells', 'Weight Plates'],
  },
  {
    category: 'Machines',
    items: ['Cable Machine', 'Lat Pulldown', 'Leg Press', 'Chest Press Machine', 'Smith Machine', 'Leg Curl Machine'],
  },
  {
    category: 'Cardio',
    items: ['Treadmill', 'Stationary Bike', 'Elliptical', 'Rowing Machine', 'Stair Climber'],
  },
  {
    category: 'Benches & Racks',
    items: ['Squat Rack', 'Flat Bench', 'Incline Bench', 'Power Rack', 'Preacher Curl Bench'],
  },
  {
    category: 'Other',
    items: ['Pull-up Bar', 'Dip Station', 'Resistance Bands', 'Battle Ropes', 'Medicine Ball', 'Foam Roller'],
  },
]

const DEFAULT_SELECTED = new Set([
  'Dumbbells', 'Barbell', 'Cable Machine', 'Flat Bench',
  'Treadmill', 'Pull-up Bar', 'Squat Rack',
])

export function GymNearbySheet({ open, onClose, onGymSaved }: GymNearbySheetProps) {
  const [screen, setScreen] = useState<Screen>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GymResult[]>([])
  const [searching, setSearching] = useState(false)
  const [location, setLocation] = useState<LocationResult | null>(null)

  const [selectedGym, setSelectedGym] = useState<GymResult | null>(null)
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set(DEFAULT_SELECTED))
  const [customInput, setCustomInput] = useState('')
  const [customItems, setCustomItems] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On open: get precise location then immediately search for nearby gyms
  useEffect(() => {
    if (!open) return
    setScreen('search')
    setQuery('')
    setResults([])
    setSelectedGym(null)
    setSelectedChips(new Set(DEFAULT_SELECTED))
    setCustomInput('')
    setCustomItems([])
    setSearching(true)

    let cancelled = false
    getUserLocation(8000)
      .then(async (loc) => {
        if (cancelled) return
        if (loc.source !== 'denied' && loc.source !== 'unavailable') {
          setLocation(loc)
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

  const handleSelectGym = (gym: GymResult) => {
    setSelectedGym(gym)
    setScreen('confirm')
  }

  const toggleChip = (item: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  const addCustomItem = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    const alreadyPreset = EQUIPMENT_PRESETS.some((g) => g.items.includes(trimmed))
    if (!alreadyPreset && !customItems.includes(trimmed)) {
      setCustomItems((prev) => [...prev, trimmed])
    }
    setSelectedChips((prev) => new Set([...prev, trimmed]))
    setCustomInput('')
  }

  const totalSelected = selectedChips.size

  const handleSave = async () => {
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
          equipment: Array.from(selectedChips),
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
                    {searching && (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <Loader2 className="w-7 h-7 text-primary-light animate-spin" />
                        <p className="text-sm text-white/80">Finding gyms near you...</p>
                        <p className="text-xs text-muted">Using your precise location</p>
                      </div>
                    )}

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
                          <div className="w-14 h-14 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                            <Dumbbell className="w-6 h-6 text-white/30" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{gym.name}</p>
                            <p className="text-xs text-muted truncate mt-0.5">{gym.address}</p>
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
                    <button
                      type="button"
                      onClick={() => setScreen('results')}
                      className="text-xs text-primary-light mb-3 hover:underline"
                    >
                      &larr; Back to results
                    </button>

                    {/* Gym info card */}
                    <div className="rounded-2xl bg-white/4 border border-white/8 p-3 mb-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-4 h-4 text-white/30" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{selectedGym.name}</p>
                        <p className="text-xs text-muted truncate">{selectedGym.address}</p>
                      </div>
                    </div>

                    {/* Instruction + count */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted">Tap to select equipment at this gym</p>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: totalSelected > 0 ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
                          color: totalSelected > 0 ? '#c4b5fd' : 'rgba(148,163,184,0.6)',
                          border: totalSelected > 0 ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {totalSelected} selected
                      </span>
                    </div>

                    {/* Equipment preset chips grouped by category */}
                    <div className="space-y-4 mb-4 max-h-[38vh] overflow-y-auto pr-1">
                      {EQUIPMENT_PRESETS.map((group) => (
                        <div key={group.category}>
                          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
                            {group.category}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.items.map((item) => {
                              const active = selectedChips.has(item)
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => toggleChip(item)}
                                  className="px-2.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                                  style={
                                    active
                                      ? {
                                          background: 'rgba(124,58,237,0.22)',
                                          color: '#c4b5fd',
                                          border: '1px solid rgba(167,139,250,0.45)',
                                          boxShadow: '0 0 8px rgba(124,58,237,0.2)',
                                        }
                                      : {
                                          background: 'rgba(255,255,255,0.04)',
                                          color: 'rgba(148,163,184,0.7)',
                                          border: '1px solid rgba(255,255,255,0.08)',
                                        }
                                  }
                                >
                                  {item}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Custom items (added by user) */}
                      {customItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
                            Custom
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {customItems.map((item) => {
                              const active = selectedChips.has(item)
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => toggleChip(item)}
                                  className="px-2.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                                  style={
                                    active
                                      ? {
                                          background: 'rgba(124,58,237,0.22)',
                                          color: '#c4b5fd',
                                          border: '1px solid rgba(167,139,250,0.45)',
                                          boxShadow: '0 0 8px rgba(124,58,237,0.2)',
                                        }
                                      : {
                                          background: 'rgba(255,255,255,0.04)',
                                          color: 'rgba(148,163,184,0.7)',
                                          border: '1px solid rgba(255,255,255,0.08)',
                                        }
                                  }
                                >
                                  {item}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add custom equipment */}
                    <div className="flex gap-2 mb-5">
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
                        placeholder="Add custom equipment..."
                        className="flex-1 px-3 py-2 rounded-xl bg-white/6 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/30"
                      />
                      <button
                        type="button"
                        onClick={addCustomItem}
                        disabled={!customInput.trim()}
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
                        disabled={saving || totalSelected === 0}
                        className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : `Confirm & Save (${totalSelected})`}
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
