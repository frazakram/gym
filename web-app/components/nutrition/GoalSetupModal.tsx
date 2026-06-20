'use client'

import { useState } from 'react'
import { Calculator, SlidersHorizontal, Flame, Pencil } from 'lucide-react'
import { SheetModal } from './SheetModal'
import type { NutritionGoals } from '@/types'

interface ProfileDefaults {
  age?: number
  weight_kg?: number
  height_cm?: number
  sex?: 'Male' | 'Female'
  /** Saved activity level from the profile (so we don't ask twice). */
  activity_level?: string
  /** Goal type mapped from the profile's training goal. */
  goal_type?: string
}

interface GoalSetupModalProps {
  open: boolean
  onClose: () => void
  current: NutritionGoals | null
  defaults: ProfileDefaults
  calcGoals: (input: {
    age: number
    weight_kg: number
    height_cm: number
    sex: 'Male' | 'Female'
    activity_level: string
    goal_type: string
    save?: boolean
  }) => Promise<{ bmr: number; tdee: number; goals: NutritionGoals } | null>
  saveGoals: (partial: Partial<NutritionGoals>) => Promise<boolean>
}

const ACTIVITY = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Little/no exercise' },
  { value: 'light', label: 'Light', hint: '1–3 days/week' },
  { value: 'moderate', label: 'Moderate', hint: '3–5 days/week' },
  { value: 'active', label: 'Active', hint: '6–7 days/week' },
  { value: 'very_active', label: 'Very active', hint: 'Hard daily + job' },
] as const

const GOAL_TYPES = [
  { value: 'deficit', label: 'Lose fat', hint: 'Slight deficit' },
  { value: 'maintenance', label: 'Maintain', hint: 'Recomposition' },
  { value: 'surplus', label: 'Gain', hint: 'Lean surplus' },
] as const

export function GoalSetupModal({ open, onClose, current, defaults, calcGoals, saveGoals }: GoalSetupModalProps) {
  const [mode, setMode] = useState<'calc' | 'manual'>('calc')

  // Body stats come from the profile. We only reveal the fields if the profile
  // is missing them, or the user taps "Adjust" — no redundant re-entry.
  const profileHasStats = defaults.age != null && defaults.weight_kg != null && defaults.height_cm != null
  const [showStats, setShowStats] = useState(!profileHasStats)

  // Calculator state (seeded from profile)
  const [age, setAge] = useState<number | ''>(defaults.age ?? 25)
  const [weight, setWeight] = useState<number | ''>(defaults.weight_kg ?? 70)
  const [height, setHeight] = useState<number | ''>(defaults.height_cm ?? 170)
  const [sex, setSex] = useState<'Male' | 'Female'>(defaults.sex ?? 'Male')
  const [activity, setActivity] = useState<string>(defaults.activity_level ?? 'moderate')
  const [goalType, setGoalType] = useState<string>(current?.goal_type ?? defaults.goal_type ?? 'maintenance')
  const [preview, setPreview] = useState<{ bmr: number; tdee: number; goals: NutritionGoals } | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Manual state
  const [cal, setCal] = useState<number | ''>(current?.daily_calorie_goal ?? 2000)
  const [protein, setProtein] = useState<number | ''>(current?.protein_goal_g ?? 150)
  const [carb, setCarb] = useState<number | ''>(current?.carb_goal_g ?? 200)
  const [fat, setFat] = useState<number | ''>(current?.fat_goal_g ?? 60)

  const canCalc = age !== '' && weight !== '' && height !== ''

  const runCalc = async () => {
    if (!canCalc) return
    setCalculating(true)
    const res = await calcGoals({
      age: Number(age),
      weight_kg: Number(weight),
      height_cm: Number(height),
      sex,
      activity_level: activity,
      goal_type: goalType,
      save: false,
    })
    if (res) setPreview(res)
    setCalculating(false)
  }

  const saveCalc = async () => {
    if (!canCalc) return
    setSaving(true)
    const res = await calcGoals({
      age: Number(age),
      weight_kg: Number(weight),
      height_cm: Number(height),
      sex,
      activity_level: activity,
      goal_type: goalType,
      save: true,
    })
    setSaving(false)
    if (res) onClose()
  }

  const saveManual = async () => {
    setSaving(true)
    const ok = await saveGoals({
      daily_calorie_goal: cal === '' ? null : Number(cal),
      protein_goal_g: protein === '' ? null : Number(protein),
      carb_goal_g: carb === '' ? null : Number(carb),
      fat_goal_g: fat === '' ? null : Number(fat),
      goal_type: (goalType as NutritionGoals['goal_type']) ?? null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const numField = (label: string, value: number | '', set: (v: number | '') => void, suffix: string) => (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <div className="flex items-center rounded-xl border border-white/12 bg-white/5 mt-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="px-3 text-xs text-muted">{suffix}</span>
      </div>
    </label>
  )

  return (
    <SheetModal
      open={open}
      onClose={onClose}
      title="Daily targets"
      subtitle="Set your calorie and macro goals"
      footer={
        mode === 'calc' ? (
          preview ? (
            <button
              onClick={saveCalc}
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold text-accent-ink bg-gradient-to-r from-primary to-primary-light disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Use these targets'}
            </button>
          ) : (
            <button
              onClick={runCalc}
              disabled={!canCalc || calculating}
              className="w-full py-3 rounded-xl text-sm font-semibold text-accent-ink bg-gradient-to-r from-primary to-primary-light disabled:opacity-50"
            >
              {calculating ? 'Calculating…' : 'Calculate my targets'}
            </button>
          )
        ) : (
          <button
            onClick={saveManual}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-accent-ink bg-gradient-to-r from-primary to-primary-light disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save targets'}
          </button>
        )
      }
    >
      {/* Mode switch */}
      <div className="flex gap-2 mb-4 p-1 rounded-xl bg-white/5 border border-white/8">
        {([
          { k: 'calc', label: 'Calculate', icon: Calculator },
          { k: 'manual', label: 'Manual', icon: SlidersHorizontal },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setMode(t.k)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === t.k ? 'bg-primary/15 text-primary-light' : 'text-muted hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {mode === 'calc' ? (
        <div className="space-y-4">
          {/* Body stats — pulled from profile, collapsed by default */}
          {!showStats ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8">
              <div className="min-w-0">
                <p className="text-[11px] text-muted">From your profile</p>
                <p className="text-sm font-medium text-white truncate">
                  {age} yr · {weight} kg · {height} cm{defaults.sex ? ` · ${sex}` : ''}
                </p>
              </div>
              <button
                onClick={() => setShowStats(true)}
                className="flex items-center gap-1 text-xs text-primary-light hover:text-primary shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" /> Adjust
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {numField('Age', age, setAge, 'yr')}
                {numField('Weight', weight, setWeight, 'kg')}
                {numField('Height', height, setHeight, 'cm')}
              </div>

              <div>
                <span className="text-[11px] text-muted">Sex (for BMR formula)</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(['Male', 'Female'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className={`py-2.5 rounded-xl text-sm border transition-colors ${
                        sex === s ? 'bg-primary/15 border-primary/40 text-primary-light' : 'border-white/12 text-muted hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <span className="text-[11px] text-muted">Activity level</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {ACTIVITY.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setActivity(a.value)}
                  className={`px-3 py-2 rounded-xl text-left border transition-colors ${
                    activity === a.value ? 'bg-primary/15 border-primary/40' : 'border-white/12 hover:bg-white/5'
                  }`}
                >
                  <span className="block text-sm font-medium text-white">{a.label}</span>
                  <span className="block text-[10px] text-muted">{a.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-muted">Goal</span>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {GOAL_TYPES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => { setGoalType(g.value); setPreview(null) }}
                  className={`px-2 py-2 rounded-xl text-center border transition-colors ${
                    goalType === g.value ? 'bg-primary/15 border-primary/40' : 'border-white/12 hover:bg-white/5'
                  }`}
                >
                  <span className="block text-sm font-medium text-white">{g.label}</span>
                  <span className="block text-[10px] text-muted">{g.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {preview && (
            <div className="rounded-2xl border border-primary/25 bg-primary/8 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-primary-light" />
                <span className="text-sm font-semibold text-white">Recommended targets</span>
              </div>
              <p className="text-[11px] text-muted mb-3">
                BMR {preview.bmr} kcal · Maintenance ≈ {preview.tdee} kcal
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="Calories" value={preview.goals.daily_calorie_goal} />
                <Stat label="Protein" value={preview.goals.protein_goal_g} suffix="g" />
                <Stat label="Carbs" value={preview.goals.carb_goal_g} suffix="g" />
                <Stat label="Fat" value={preview.goals.fat_goal_g} suffix="g" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {numField('Daily calories', cal, setCal, 'kcal')}
          <div className="grid grid-cols-3 gap-2">
            {numField('Protein', protein, setProtein, 'g')}
            {numField('Carbs', carb, setCarb, 'g')}
            {numField('Fat', fat, setFat, 'g')}
          </div>
          <p className="text-[11px] text-muted">Override any value — these become your daily goals immediately.</p>
        </div>
      )}
    </SheetModal>
  )
}

function Stat({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="rounded-lg bg-white/5 py-2">
      <p className="text-sm font-bold text-white">{value ?? '—'}{suffix && value != null ? suffix : ''}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  )
}
