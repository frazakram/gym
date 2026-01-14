'use client'

import { useMemo, useState } from 'react'
import { Profile } from '@/types'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { Chip } from '../ui/Chip'
import { AnimatedButton, IconButton } from '../ui/AnimatedButton'
import { Collapsible } from '../ui/Collapsible'

interface ProfileViewProps {
  profile: (Profile & { username?: string }) | null
  name: string
  age: number | ''
  weight: number | ''
  height: number | ''
  heightUnit: 'cm' | 'ftin'
  heightFeet: number | ''
  heightInches: number | ''
  gender: Profile['gender']
  goal: Profile['goal']
  level: 'Beginner' | 'Regular' | 'Expert'
  tenure: string
  goalWeight: number | ''
  goalDuration: string
  notes: string
  // Diet Props
  dietType: string[]
  cuisine: Profile['cuisine']
  proteinPowder: Profile['protein_powder']
  proteinPowderAmount: number
  specificFoodPreferences: string
  mealsPerDay: number
  allergies: string[]
  cookingLevel: string
  budget: string
  resolvedHeightCm: number | null
  onUpdateField: (field: string, value: unknown) => void
  onSaveProfile: (e: React.FormEvent) => void
  onResetRoutines: () => void
  onLogout: () => void
  loading: boolean
}

export function ProfileView({
  profile,
  name,
  age,
  weight,
  height,
  heightUnit,
  heightFeet,
  heightInches,
  gender,
  goal,
  level,
  tenure,
  goalWeight,
  goalDuration,
  notes,
  dietType,
  cuisine,
  proteinPowder,
  proteinPowderAmount,
  specificFoodPreferences,
  mealsPerDay,
  allergies,
  cookingLevel,
  budget,
  resolvedHeightCm,
  onUpdateField,
  onSaveProfile,
  onResetRoutines,
  onLogout,
  loading,
}: ProfileViewProps) {
  const [advancedNutritionOpen, setAdvancedNutritionOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)

  const goalOptions: Profile['goal'][] = useMemo(
    () => ['General fitness', 'Fat loss', 'Muscle gain', 'Strength', 'Recomposition', 'Endurance'],
    []
  )
  const levelOptions: Array<'Beginner' | 'Regular' | 'Expert'> = useMemo(
    () => ['Beginner', 'Regular', 'Expert'],
    []
  )
  const genderOptions: Profile['gender'][] = useMemo(
    () => ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
    []
  )

  const dietTypeOptions = useMemo(
    () => [
      'No Restrictions',
      'Vegetarian',
      'Vegan',
      'Pescatarian',
      'Keto',
      'Paleo',
      'Strictly Non-Vegetarian',
      'Halal',
      'Kosher',
      'Gluten-Free',
    ],
    []
  )

  const allergyOptions = useMemo(() => ['Dairy', 'Gluten', 'Nuts', 'Shellfish', 'Eggs', 'Soy'], [])

  // Get avatar emoji based on gender
  const getAvatarEmoji = () => {
    switch(gender) {
      case 'Male': return '👨'
      case 'Female': return '👩'
      case 'Non-binary': return '🧑'
      default: return '👤'
    }
  }

  return (
    <form onSubmit={onSaveProfile} className="pb-24 px-4 pt-5 space-y-4 view-transition">
      {/* Header */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-400/12 border border-emerald-400/20 flex items-center justify-center text-3xl">
            {getAvatarEmoji()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-white truncate">
              {profile?.username || 'Profile'}
            </p>
            <p className="mt-0.5 text-xs text-slate-300/70">
              {age || '—'} yrs • {gender}
            </p>
          </div>
          <IconButton onClick={onLogout} ariaLabel="Logout" className="hover:bg-red-500/10 hover:text-red-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </IconButton>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="glass-soft rounded-2xl border border-white/10 p-2 text-center">
            <p className="text-[16px] font-semibold text-white">{weight || '—'}</p>
            <p className="text-[10px] text-slate-300/60 mt-0.5">kg</p>
          </div>
          <div className="glass-soft rounded-2xl border border-white/10 p-2 text-center">
            <p className="text-[16px] font-semibold text-white">{resolvedHeightCm || '—'}</p>
            <p className="text-[10px] text-slate-300/60 mt-0.5">cm</p>
          </div>
          <div className="glass-soft rounded-2xl border border-white/10 p-2 text-center">
            <p className="text-[14px] font-semibold text-white">{level}</p>
            <p className="text-[10px] text-slate-300/60 mt-0.5">level</p>
          </div>
        </div>
      </GlassCard>

      {/* Fitness */}
      <GlassCard className="p-4">
        <SectionHeader title="Fitness" subtitle="Set the basics that drive your plan" />

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-slate-300/70 mb-2">Goal</p>
            <div className="flex flex-wrap gap-2">
              {goalOptions.map((g) => (
                <Chip key={g} selected={goal === g} onClick={() => onUpdateField('goal', g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-300/70 mb-2">Level</p>
            <div className="flex flex-wrap gap-2">
              {levelOptions.map((l) => (
                <Chip key={l} selected={level === l} onClick={() => onUpdateField('level', l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-300/70 mb-2">Gender</p>
            <div className="flex flex-wrap gap-2">
              {genderOptions.map((g) => (
                <Chip key={g} selected={gender === g} onClick={() => onUpdateField('gender', g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Body metrics */}
      <GlassCard className="p-4">
        <SectionHeader title="Body" subtitle="Used for calorie and training estimates" />

        <div className="mt-4 space-y-3">
          <div>
             <label className="block text-xs text-slate-300/70 mb-2">Display Name (optional)</label>
             <input
               type="text"
               value={name}
               onChange={(e) => onUpdateField('name', e.target.value)}
               placeholder={profile?.username?.split('@')[0] || 'Your Name'}
               className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-slate-400/70 ui-focus-ring border border-white/10"
             />
          </div>
          <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-300/70 mb-2">Age</label>
            <input
              inputMode="numeric"
              type="number"
              value={age}
              onChange={(e) => onUpdateField('age', e.target.value === '' ? '' : Number(e.target.value))}
              min="16"
              max="100"
              className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300/70 mb-2">Weight (kg)</label>
            <input
              inputMode="decimal"
              type="number"
              value={weight}
              onChange={(e) => onUpdateField('weight', e.target.value === '' ? '' : Number(e.target.value))}
              min="30"
              max="300"
              step="0.1"
              className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
            />
          </div>
        </div>
      </div>

        <div className="mt-4">
          <p className="text-xs text-slate-300/70 mb-2">Height unit</p>
          <div className="flex gap-2">
            <Chip selected={heightUnit === 'cm'} onClick={() => onUpdateField('heightUnit', 'cm')}>
              cm
            </Chip>
            <Chip selected={heightUnit === 'ftin'} onClick={() => onUpdateField('heightUnit', 'ftin')}>
              ft + in
            </Chip>
          </div>
        </div>

        <div className="mt-3">
          {heightUnit === 'cm' ? (
            <div>
              <label className="block text-xs text-slate-300/70 mb-2">Height (cm)</label>
              <input
                inputMode="decimal"
                type="number"
                value={height}
                onChange={(e) => onUpdateField('height', e.target.value === '' ? '' : Number(e.target.value))}
                min="100"
                max="250"
                step="0.1"
                className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Feet</label>
                <input
                  inputMode="numeric"
                  type="number"
                  value={heightFeet}
                  onChange={(e) => onUpdateField('heightFeet', e.target.value === '' ? '' : Number(e.target.value))}
                  min="3"
                  max="8"
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Inches</label>
                <input
                  inputMode="decimal"
                  type="number"
                  value={heightInches}
                  onChange={(e) => onUpdateField('heightInches', e.target.value === '' ? '' : Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  max="11.9"
                  step="0.1"
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                />
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Training */}
      <GlassCard className="p-4">
        <SectionHeader title="Training" subtitle="Helps the AI match volume and recovery" />
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-300/70 mb-2">Training duration</label>
            <input
              type="text"
              value={tenure}
              onChange={(e) => onUpdateField('tenure', e.target.value)}
              placeholder="e.g., Just started, 6 months, 2 years"
              className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-slate-400/70 ui-focus-ring border border-white/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300/70 mb-2">Goal weight (kg)</label>
              <input
                inputMode="decimal"
                type="number"
                value={goalWeight}
                onChange={(e) => onUpdateField('goalWeight', e.target.value === '' ? '' : Number(e.target.value))}
                min="30"
                max="300"
                step="0.1"
                placeholder="Optional"
                className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-slate-400/70 ui-focus-ring border border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300/70 mb-2">Goal timeline</label>
              <input
                type="text"
                value={goalDuration}
                onChange={(e) => onUpdateField('goalDuration', e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-slate-400/70 ui-focus-ring border border-white/10"
              />
            </div>
          </div>

          <Collapsible
            open={notesOpen}
            onToggle={() => setNotesOpen(v => !v)}
            header={
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold text-white">Notes</p>
                  <p className="text-xs text-slate-300/70 truncate">
                    {notes ? 'Used to avoid injuries and match preferences' : 'Add injuries, constraints, or preferences'}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            }
            className="mt-2"
          >
            <textarea
              value={notes}
              onChange={(e) => onUpdateField('notes', e.target.value)}
              rows={4}
              placeholder="Example: knee pain (avoid heavy squats), prefer dumbbells, 45 min sessions."
              className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-slate-400/70 ui-focus-ring border border-white/10 resize-none"
            />
          </Collapsible>
        </div>
      </GlassCard>

      {/* Nutrition preferences */}
      <GlassCard className="p-4">
        <SectionHeader title="Nutrition" subtitle="Diet rules and meal structure" />

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-slate-300/70 mb-2">Diet type</p>
            <div className="flex flex-wrap gap-2">
              {dietTypeOptions.map((t) => {
                const selected = (dietType || []).includes(t)
                return (
                  <Chip
                    key={t}
                    selected={selected}
                    onClick={() => {
                      const current = dietType || []
                      let next: string[]
                      if (t === 'No Restrictions') {
                        next = ['No Restrictions']
                      } else {
                        const filtered = current.filter(x => x !== 'No Restrictions')
                        next = selected ? filtered.filter(x => x !== t) : [...filtered, t]
                      }
                      if (next.length === 0) next = ['No Restrictions']
                      onUpdateField('dietType', next)
                    }}
                  >
                    {t}
                  </Chip>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-300/70 mb-2">Allergies (optional)</p>
            <div className="flex flex-wrap gap-2">
              {allergyOptions.map((a) => {
                const selected = (allergies || []).includes(a)
                return (
                  <Chip
                    key={a}
                    selected={selected}
                    onClick={() => {
                      const current = allergies || []
                      const next = selected ? current.filter(x => x !== a) : [...current, a]
                      onUpdateField('allergies', next)
                    }}
                  >
                    {a}
                  </Chip>
                )
              })}
              <Chip selected={(allergies || []).length === 0} onClick={() => onUpdateField('allergies', [])}>
                None
              </Chip>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-300/70 mb-2">Meals per day</p>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6].map((m) => (
                <Chip key={m} selected={mealsPerDay === m} onClick={() => onUpdateField('mealsPerDay', m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </div>

          <Collapsible
            open={advancedNutritionOpen}
            onToggle={() => setAdvancedNutritionOpen(v => !v)}
            header={
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold text-white">Advanced nutrition</p>
                  <p className="text-xs text-slate-300/70">Cuisine, protein powder, strict inclusions</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            }
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Cuisine</label>
                <select
                  value={cuisine || 'No Preference'}
                  onChange={(e) => onUpdateField('cuisine', e.target.value)}
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 bg-transparent"
                >
                  {[
                    'No Preference',
                    'North Indian',
                    'South Indian',
                    'Mughlai',
                    'Mediterranean',
                    'American',
                    'Mexican',
                    'Asian',
                  ].map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs text-slate-300/70 mb-2">Protein powder</p>
                <div className="flex gap-2">
                  <Chip selected={proteinPowder === 'Yes'} onClick={() => onUpdateField('proteinPowder', 'Yes')}>
                    Yes
                  </Chip>
                  <Chip selected={proteinPowder !== 'Yes'} onClick={() => onUpdateField('proteinPowder', 'No')}>
                    No
                  </Chip>
                </div>
              </div>

              {proteinPowder === 'Yes' ? (
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Protein from powder (g/day)</label>
                  <input
                    inputMode="numeric"
                    type="number"
                    value={proteinPowderAmount || ''}
                    onChange={(e) => onUpdateField('proteinPowderAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="e.g. 25"
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                  />
                </div>
              ) : null}

              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Specific inclusions / exclusions</label>
                <textarea
                  value={specificFoodPreferences || ''}
                  onChange={(e) => onUpdateField('specificFoodPreferences', e.target.value)}
                  rows={3}
                  placeholder="Example: include oats daily, exclude mushrooms; no bell peppers."
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 placeholder:text-slate-400/70 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Cooking</label>
                  <select
                    value={cookingLevel || 'Moderate'}
                    onChange={(e) => onUpdateField('cookingLevel', e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 bg-transparent"
                  >
                    {['Full Prep', 'Moderate', 'Minimal', 'No Cooking'].map((v) => (
                      <option key={v} value={v} className="bg-slate-900">
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Budget</label>
                  <select
                    value={budget || 'Standard'}
                    onChange={(e) => onUpdateField('budget', e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 bg-transparent"
                  >
                    {['Budget-Friendly', 'Standard', 'Premium'].map((v) => (
                      <option key={v} value={v} className="bg-slate-900">
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Collapsible>
        </div>
      </GlassCard>

      {/* Save / danger */}
      <AnimatedButton
        variant="primary"
        fullWidth
        disabled={loading}
        loading={loading}
        className="rounded-2xl"
      >
        {loading ? 'Saving...' : 'Save changes'}
      </AnimatedButton>

      <button
        type="button"
        onClick={onResetRoutines}
        className="w-full py-3 px-4 rounded-2xl bg-red-500/12 hover:bg-red-500/16 text-red-200 text-sm font-medium transition border border-red-500/25 ui-focus-ring"
      >
        Reset routine data
      </button>
    </form>
  )
}
