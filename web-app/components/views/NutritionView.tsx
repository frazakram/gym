'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, Target, Flame, Loader2, Star, History, Utensils,
} from 'lucide-react'
import type { Profile, DraftFoodItem, FoodEntry, FoodSearchResult, FavoriteFood } from '@/types'
import { useNutrition, todayStr } from '@/hooks/useNutrition'
import { draftFromSearchResult, blankDraft, draftFromEntry } from '@/lib/nutrition/scale'
import { toastInfo } from '@/lib/toast'

import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MacroProgress } from '@/components/nutrition/MacroProgress'
import { LogFoodSheet, type LogMethod } from '@/components/nutrition/LogFoodSheet'
import { SheetModal } from '@/components/nutrition/SheetModal'
import { FoodSearchPanel } from '@/components/nutrition/FoodSearchPanel'
import { DraftFoodEditor } from '@/components/nutrition/DraftFoodEditor'
import { BarcodeScannerModal } from '@/components/nutrition/BarcodeScannerModal'
import { PhotoLogModal, photoFallbackCopy } from '@/components/nutrition/PhotoLogModal'
import { GoalSetupModal } from '@/components/nutrition/GoalSetupModal'
import { NutritionHistory } from '@/components/nutrition/NutritionHistory'
import { FoodEntryRow } from '@/components/nutrition/FoodEntryRow'

interface NutritionViewProps {
  profile: Profile | null
}

function prettyDate(iso: string): string {
  if (iso === todayStr()) return 'Today'
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function NutritionView({ profile }: NutritionViewProps) {
  const n = useNutrition()
  const {
    date, summary, goals, hasGoals, loading, mutating,
    goToDate, logItems, logFavorite, updateEntry, deleteEntry, removeFavorite,
    saveGoals, calcGoals, search, lookupBarcode, recognizePhoto,
  } = n

  // Modal state
  const [logOpen, setLogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [barcodeOpen, setBarcodeOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [draft, setDraft] = useState<DraftFoodItem[] | null>(null)
  const [editing, setEditing] = useState<FoodEntry | null>(null)

  const isToday = date === todayStr()
  const entries = summary?.entries ?? []
  const quickFoods = dedupeQuick(summary?.recent ?? [], summary?.favorites ?? [])

  // ---- Entry-method routing ----
  const pickMethod = (m: LogMethod) => {
    setLogOpen(false)
    if (m === 'search') setSearchOpen(true)
    else if (m === 'barcode') setBarcodeOpen(true)
    else if (m === 'photo') setPhotoOpen(true)
    else setDraft([blankDraft()])
  }

  const handleSearchSelect = (r: FoodSearchResult) => {
    setSearchOpen(false)
    setDraft([draftFromSearchResult(r)])
  }

  const handleBarcode = async (code: string) => {
    setBarcodeOpen(false)
    const result = await lookupBarcode(code)
    if (result) {
      setDraft([draftFromSearchResult(result)])
    } else {
      toastInfo('Barcode not found', 'Search for this item instead.')
      setSearchOpen(true)
    }
  }

  const handlePhotoFallback = (reason?: string) => {
    setPhotoOpen(false)
    if (reason && reason !== 'not_configured') toastInfo('Manual logging', photoFallbackCopy(reason))
    setSearchOpen(true)
  }

  // ---- Draft confirm (new logging) ----
  const confirmDraft = async (items: DraftFoodItem[], opts: { favorite: boolean }) => {
    const ok = await logItems(items, opts)
    if (ok) setDraft(null)
  }

  // ---- Edit existing entry ----
  const confirmEdit = async (items: DraftFoodItem[]) => {
    if (!editing) return
    const [first, ...rest] = items
    if (first) {
      await updateEntry(editing.id, {
        name: first.name,
        calories: Math.round(first.calories),
        protein_g: first.protein_g,
        carb_g: first.carb_g,
        fat_g: first.fat_g,
        quantity: first.quantity,
        unit: first.unit,
      })
    }
    if (rest.length > 0) await logItems(rest)
    setEditing(null)
  }

  const profileSex: 'Male' | 'Female' | undefined =
    profile?.gender === 'Male' || profile?.gender === 'Female' ? profile.gender : undefined

  // Map the profile's training goal to a nutrition goal type, so the wizard
  // pre-selects sensibly instead of asking again.
  const goalTypeFromProfile =
    profile?.goal === 'Fat loss' ? 'deficit' : profile?.goal === 'Muscle gain' ? 'surplus' : 'maintenance'

  return (
    <div className="pb-28 px-4 py-6 space-y-5">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goToDate(shiftDate(date, -1))}
          aria-label="Previous day"
          className="p-2 rounded-xl glass-soft text-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-soft"
        >
          <CalendarDays className="w-4 h-4 text-primary-light" />
          <span className="text-sm font-semibold text-white">{prettyDate(date)}</span>
        </button>
        <button
          onClick={() => goToDate(shiftDate(date, 1))}
          aria-label="Next day"
          disabled={isToday}
          className="p-2 rounded-xl glass-soft text-muted hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Daily progress / goal setup */}
      <GlassCard className="p-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : hasGoals ? (
          <>
            <SectionHeader
              title="Today's intake"
              subtitle={isToday ? 'Live totals vs your daily goal' : prettyDate(date)}
              right={
                <button
                  onClick={() => setGoalsOpen(true)}
                  className="flex items-center gap-1 text-xs text-primary-light hover:text-primary"
                >
                  <Target className="w-3.5 h-3.5" /> Goals
                </button>
              }
              className="mb-4"
            />
            <MacroProgress totals={summary?.totals ?? { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 }} goals={goals} />
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center mx-auto mb-3">
              <Flame className="w-7 h-7 text-primary-light" />
            </div>
            <h3 className="text-lg font-bold text-white font-display mb-1">Set your daily targets</h3>
            <p className="text-sm text-muted mb-4 max-w-xs mx-auto">
              Calculate calories &amp; macros from your body stats, or enter them manually.
            </p>
            <button
              onClick={() => setGoalsOpen(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-accent-ink bg-gradient-to-r from-primary to-primary-light shadow-lg active:scale-95 transition-transform"
            >
              Set up goals
            </button>
          </div>
        )}
      </GlassCard>

      {/* Log food CTA */}
      <button
        onClick={() => setLogOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-accent-ink bg-gradient-to-r from-primary to-primary-light shadow-lg active:scale-[0.98] transition-transform"
      >
        <Plus className="w-5 h-5" /> Log food
      </button>

      {/* Quick log (recent + favorites) */}
      {quickFoods.length > 0 && (
        <div>
          <SectionHeader title="Quick log" subtitle="Recent &amp; saved foods" className="mb-3" />
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {quickFoods.map((f) => (
              <QuickChip key={`${f.id}-${f.name}`} food={f} onLog={() => logFavorite(f)} onRemoveFav={f.isFavorite ? () => removeFavorite(f.id) : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Today's entries */}
      <div>
        <SectionHeader
          title="Logged"
          subtitle={`${entries.length} item${entries.length !== 1 ? 's' : ''}`}
          right={
            <button onClick={() => setHistoryOpen(true)} className="flex items-center gap-1 text-xs text-muted hover:text-white">
              <History className="w-3.5 h-3.5" /> History
            </button>
          }
          className="mb-3"
        />
        {entries.length === 0 ? (
          <GlassCard variant="soft" className="p-8 text-center">
            <Utensils className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">Nothing logged {isToday ? 'yet today' : 'this day'}. Tap “Log food” to start.</p>
          </GlassCard>
        ) : (
          <motion.div layout className="space-y-2">
            {entries.map((e) => (
              <FoodEntryRow key={e.id} entry={e} onEdit={setEditing} onDelete={deleteEntry} />
            ))}
          </motion.div>
        )}
      </div>

      {/* ---- Modals ---- */}
      <LogFoodSheet open={logOpen} onClose={() => setLogOpen(false)} onPick={pickMethod} />

      <SheetModal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search foods" subtitle="Open Food Facts database">
        <FoodSearchPanel onSearch={search} onSelect={handleSearchSelect} autoFocus />
      </SheetModal>

      <BarcodeScannerModal open={barcodeOpen} onClose={() => setBarcodeOpen(false)} onDetected={handleBarcode} />

      <PhotoLogModal
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        recognize={recognizePhoto}
        onRecognized={(items) => { setPhotoOpen(false); setDraft(items) }}
        onFallback={handlePhotoFallback}
      />

      {/* New-log draft editor */}
      <SheetModal open={draft !== null} onClose={() => setDraft(null)} title="Review &amp; log" subtitle="Adjust before saving — nothing is logged until you confirm">
        {draft && (
          <DraftFoodEditor initialItems={draft} onSearch={search} onConfirm={confirmDraft} confirming={mutating} />
        )}
      </SheetModal>

      {/* Edit existing entry */}
      <SheetModal open={editing !== null} onClose={() => setEditing(null)} title="Edit entry" subtitle="Update quantity or macros">
        {editing && (
          <DraftFoodEditor
            initialItems={[draftFromEntry(editing)]}
            onSearch={search}
            onConfirm={(items) => confirmEdit(items)}
            confirming={mutating}
            confirmLabel="Save changes"
          />
        )}
      </SheetModal>

      <GoalSetupModal
        open={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        current={goals}
        defaults={{
          age: profile?.age,
          weight_kg: profile?.weight,
          height_cm: profile?.height,
          sex: profileSex,
          activity_level: profile?.activity_level,
          goal_type: goalTypeFromProfile,
        }}
        calcGoals={calcGoals}
        saveGoals={saveGoals}
      />

      <NutritionHistory open={historyOpen} onClose={() => setHistoryOpen(false)} goals={goals} onPickDay={goToDate} />
    </div>
  )
}

// ---- Quick-log chip ----
type QuickFood = FavoriteFood & { isFavorite?: boolean }

function dedupeQuick(recent: FavoriteFood[], favorites: FavoriteFood[]): QuickFood[] {
  const out: QuickFood[] = favorites.map((f) => ({ ...f, isFavorite: true }))
  const seen = new Set(favorites.map((f) => `${f.name.toLowerCase()}|${f.unit}`))
  for (const r of recent) {
    const key = `${r.name.toLowerCase()}|${r.unit}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push({ ...r, isFavorite: false })
    }
  }
  return out.slice(0, 12)
}

function QuickChip({ food, onLog, onRemoveFav }: { food: QuickFood; onLog: () => void; onRemoveFav?: () => void }) {
  return (
    <div className="relative shrink-0">
      <button
        onClick={onLog}
        className="flex flex-col items-start gap-1 w-36 p-3 rounded-2xl bg-white/4 border border-white/8 hover:border-primary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 w-full">
          {food.isFavorite && <Star className="w-3 h-3 text-gold shrink-0" />}
          <span className="text-sm font-medium text-white truncate">{food.name}</span>
        </div>
        <span className="text-[11px] text-muted">{Math.round(food.calories)} kcal · +1 tap</span>
      </button>
      {onRemoveFav && (
        <button
          onClick={onRemoveFav}
          aria-label="Remove favorite"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-black/10 text-muted hover:text-coral text-xs flex items-center justify-center shadow"
        >
          ×
        </button>
      )}
    </div>
  )
}
