'use client'

import { useState } from 'react'
import { Profile } from '@/types'
import { GlassSelect } from '../GlassSelect'

interface ProfileViewProps {
  profile: Profile | null
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
  onUpdateField: (field: string, value: any) => void
  onSaveProfile: (e: React.FormEvent) => void
  onResetRoutines: () => void
  onLogout: () => void
  loading: boolean
}

export function ProfileView({
  profile,
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
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const levelOptions = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Regular', label: 'Regular' },
    { value: 'Expert', label: 'Expert' },
  ]

  const genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Non-binary', label: 'Non-binary' },
    { value: 'Prefer not to say', label: 'Prefer not to say' },
  ]

  const goalOptions = [
    { value: 'General fitness', label: 'General fitness' },
    { value: 'Fat loss', label: 'Fat loss' },
    { value: 'Muscle gain', label: 'Muscle gain' },
    { value: 'Strength', label: 'Strength' },
    { value: 'Recomposition', label: 'Recomposition' },
    { value: 'Endurance', label: 'Endurance' },
  ]

  const heightUnitOptions = [
    { value: 'cm', label: 'cm' },
    { value: 'ftin', label: 'ft + in' },
  ]

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
    <div className="pb-24 px-4 py-4 space-y-4">
      {/* User Card */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          {/* Profile Photo - Gender-based Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl">
            {getAvatarEmoji()}
          </div>
          
          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white mb-0.5 truncate">
              {(profile as any)?.username || 'User'}
            </h2>
            <p className="text-xs text-slate-300/70">
              {age} yrs • {gender}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg glass-soft hover:bg-red-500/10 text-slate-300 hover:text-red-300 transition flex-shrink-0"
            aria-label="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-soft rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-white">{weight || '—'}</p>
            <p className="text-[10px] text-slate-300/60 mt-0.5">kg</p>
          </div>
          <div className="glass-soft rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-white">{resolvedHeightCm || '—'}</p>
            <p className="text-[10px] text-slate-300/60 mt-0.5">cm</p>
          </div>
          <div className="glass-soft rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-white">{level}</p>
            <p className="text-[10px] text-slate-300/60 mt-0.5">Level</p>
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Goals</h3>
        
        {/* Current Goal */}
        <button
          onClick={() => toggleSection('goal')}
          className="w-full flex items-center justify-between p-4 glass-soft rounded-xl hover:bg-white/10 transition"
        >
          <div className="text-left">
            <p className="text-sm text-slate-300/70">Current Goal</p>
            <p className="font-semibold text-white">{goal}</p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {expandedSection === 'goal' && (
          <div className="mt-3 p-4 glass-soft rounded-xl space-y-3">
            <GlassSelect
              label="Select Goal"
              value={goal}
              options={goalOptions as any}
              onChange={(v) => onUpdateField('goal', v)}
            />
          </div>
        )}

        {/* Goal Weight */}
        <button
          onClick={() => toggleSection('goalWeight')}
          className="w-full flex items-center justify-between p-4 glass-soft rounded-xl hover:bg-white/10 transition mt-3"
        >
          <div className="text-left">
            <p className="text-sm text-slate-300/70">Goal Weight</p>
            <p className="font-semibold text-white">{goalWeight ? `${goalWeight} kg` : 'Not set'}</p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {expandedSection === 'goalWeight' && (
          <div className="mt-3 p-4 glass-soft rounded-xl">
            <label className="block text-sm font-medium text-slate-200/90 mb-2">Goal Weight (kg)</label>
            <input
              type="number"
              value={goalWeight}
              onChange={(e) => {
                const v = e.target.value
                onUpdateField('goalWeight', v === '' ? '' : Number(v))
              }}
              min="30"
              max="300"
              step="0.1"
              placeholder="e.g., 72"
              className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Preferences</h3>

        {/* Stats */}
        <button
          onClick={() => toggleSection('stats')}
          className="w-full flex items-center justify-between p-4 glass-soft rounded-xl hover:bg-white/10 transition"
        >
          <div className="text-left">
            <p className="text-sm text-slate-300/70">Basic Stats</p>
            <p className="font-semibold text-white">Age, Weight, Height</p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {expandedSection === 'stats' && (
          <div className="mt-3 p-4 glass-soft rounded-xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200/90 mb-2">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => {
                  const v = e.target.value
                  onUpdateField('age', v === '' ? '' : Number(v))
                }}
                min="16"
                max="100"
                className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200/90 mb-2">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => {
                  const v = e.target.value
                  onUpdateField('weight', v === '' ? '' : Number(v))
                }}
                min="30"
                max="300"
                step="0.1"
                className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
            <div>
              <GlassSelect
                label="Height unit"
                value={heightUnit}
                options={heightUnitOptions as any}
                onChange={(v) => onUpdateField('heightUnit', v as 'cm' | 'ftin')}
              />
            </div>
            {heightUnit === 'cm' ? (
              <div>
                <label className="block text-sm font-medium text-slate-200/90 mb-2">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => {
                    const v = e.target.value
                    onUpdateField('height', v === '' ? '' : Number(v))
                  }}
                  min="100"
                  max="250"
                  step="0.1"
                  className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-200/90 mb-2">Feet</label>
                  <input
                    type="number"
                    value={heightFeet}
                    onChange={(e) => {
                      const v = e.target.value
                      onUpdateField('heightFeet', v === '' ? '' : Number(v))
                    }}
                    min="3"
                    max="8"
                    className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200/90 mb-2">Inches</label>
                  <input
                    type="number"
                    value={heightInches}
                    onChange={(e) => {
                      const v = e.target.value
                      onUpdateField('heightInches', v === '' ? '' : Number(v))
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    min="0"
                    max="11.9"
                    step="0.1"
                    className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Level & Gender */}
        <button
          onClick={() => toggleSection('level')}
          className="w-full flex items-center justify-between p-4 glass-soft rounded-xl hover:bg-white/10 transition mt-3"
        >
          <div className="text-left">
            <p className="text-sm text-slate-300/70">Level & Gender</p>
            <p className="font-semibold text-white">{level} • {gender}</p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {expandedSection === 'level' && (
          <div className="mt-3 p-4 glass-soft rounded-xl space-y-4">
            <GlassSelect
              label="Experience Level"
              value={level}
              options={levelOptions as any}
              onChange={(v) => onUpdateField('level', v)}
            />
            <GlassSelect
              label="Gender"
              value={gender}
              options={genderOptions as any}
              onChange={(v) => onUpdateField('gender', v)}
            />
          </div>
        )}

        {/* Training Duration */}
        <button
          onClick={() => toggleSection('duration')}
          className="w-full flex items-center justify-between p-4 glass-soft rounded-xl hover:bg-white/10 transition mt-3"
        >
          <div className="text-left">
            <p className="text-sm text-slate-300/70">Training Duration</p>
            <p className="font-semibold text-white">{tenure || 'Not set'}</p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {expandedSection === 'duration' && (
          <div className="mt-3 p-4 glass-soft rounded-xl">
            <label className="block text-sm font-medium text-slate-200/90 mb-2">Training Duration</label>
            <input
              type="text"
              value={tenure}
              onChange={(e) => onUpdateField('tenure', e.target.value)}
              placeholder="e.g., '6 months' or 'Just started'"
              className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>
        )}

        {/* Notes */}
        <button
          onClick={() => toggleSection('notes')}
          className="w-full flex items-center justify-between p-4 glass-soft rounded-xl hover:bg-white/10 transition mt-3"
        >
          <div className="text-left">
            <p className="text-sm text-slate-300/70">Additional Notes</p>
            <p className="font-semibold text-white truncate">{notes || 'None'}</p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {expandedSection === 'notes' && (
          <div className="mt-3 p-4 glass-soft rounded-xl">
            <label className="block text-sm font-medium text-slate-200/90 mb-2">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => onUpdateField('notes', e.target.value)}
              rows={4}
              placeholder="Injuries, preferences, goals..."
              className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 resize-none"
            />
          </div>
        )}
      </div>

      {/* Nutrition Preferences */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Nutrition Preferences</h3>

        <button
          onClick={() => toggleSection('nutrition')}
          className="w-full flex items-center justify-between p-4 glass-soft rounded-xl hover:bg-white/10 transition"
        >
          <div className="text-left">
            <p className="text-sm text-slate-300/70">Diet & Meals</p>
            <p className="font-semibold text-white">{(dietType && dietType.length > 0) ? (dietType.length > 1 ? `${dietType.length} Selected` : dietType[0]) : 'Any'} • {cuisine || 'Any'}</p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {expandedSection === 'nutrition' && (
          <div className="mt-3 p-4 glass-soft rounded-xl">
            <div className="space-y-6">
            <div className="pb-2 border-b border-white/5">
                <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                    <span className="text-xl">🥗</span> Nutrition Preferences
                </h3>
                <p className="text-sm text-slate-400 mt-1">Customize your meal plan engine.</p>
            </div>
             
             {/* Diet Type (Multi-select) */}
             <div>
                <label className="block text-sm font-medium text-slate-200/90 mb-2">Dietary Type (Select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'No Restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 
                    'Keto', 'Paleo', 'Strictly Non-Vegetarian', 'Halal', 'Kosher', 'Gluten-Free'
                  ].map((type) => {
                    const isSelected = (dietType || []).includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          const current = dietType || [];
                          let newTypes;
                          if (type === 'No Restrictions') {
                             newTypes = ['No Restrictions'];
                          } else {
                             // Remove 'No Restrictions' if other is selected
                             const filtered = current.filter(t => t !== 'No Restrictions');
                             if (isSelected) {
                               newTypes = filtered.filter(t => t !== type);
                             } else {
                               newTypes = [...filtered, type];
                             }
                          }
                          if (newTypes.length === 0) newTypes = ['No Restrictions'];
                          onUpdateField('dietType', newTypes);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                          isSelected 
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-sm shadow-cyan-500/10' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
             </div>

             {/* Allergies (Multi-select) */}
             <div>
                <label className="block text-sm font-medium text-slate-200/90 mb-2">Allergies / Intolerances</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'None', 'Dairy', 'Gluten', 'Nuts', 'Shellfish', 'Eggs', 'Soy'
                  ].map((allergy) => {
                    const isSelected = (allergies || []).includes(allergy);
                    return (
                      <button
                        key={allergy}
                        onClick={() => {
                          const current = allergies || [];
                          let newAllergies: string[];
                          if (allergy === 'None') {
                             newAllergies = []; // Empty array means None
                          } else {
                             if (isSelected) {
                               newAllergies = current.filter(t => t !== allergy);
                             } else {
                               newAllergies = [...current, allergy];
                             }
                          }
                          onUpdateField('allergies', newAllergies);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                           isSelected 
                            ? 'bg-red-500/20 border-red-500 text-red-200 shadow-sm shadow-red-500/10' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        {allergy}
                      </button>
                    );
                  })}
                </div>
             </div>

             <GlassSelect
               label="Cuisine / Region"
               value={cuisine || 'No Preference'}
               options={[
                  { value: 'No Preference', label: 'No Preference' },
                  { value: 'North Indian', label: 'North Indian' },
                  { value: 'South Indian', label: 'South Indian' },
                  { value: 'Mughlai', label: 'Mughlai' },
                  { value: 'Mediterranean', label: 'Mediterranean' },
                  { value: 'American', label: 'American' },
                  { value: 'Mexican', label: 'Mexican' },
                  { value: 'Asian', label: 'Asian' },
               ] as any}
               onChange={(v) => onUpdateField('cuisine', v)}
             />

             <div className="grid grid-cols-2 gap-3">
                <GlassSelect
                   label="Meals Per Day"
                   value={String(mealsPerDay)}
                   options={[
                      { value: '2', label: '2 Meals' },
                      { value: '3', label: '3 Meals' },
                      { value: '4', label: '4 Meals' },
                      { value: '5', label: '5 Meals' },
                      { value: '6', label: '6 Meals' },
                   ] as any}
                   onChange={(v) => onUpdateField('mealsPerDay', Number(v))}
                />
                <GlassSelect
                  label="Protein Powder?"
                  value={proteinPowder || 'No'}
                  options={[
                      { value: 'Yes', label: 'Yes' },
                      { value: 'No', label: 'No' },
                  ] as any}
                  onChange={(v) => onUpdateField('proteinPowder', v)}
                />
                {(proteinPowder === 'Yes') && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-slate-200/90 mb-2">Protein Intake from Powder (g/day)</label>
                    <div className="relative">
                        <input
                        type="number"
                        value={proteinPowderAmount || ''}
                        onChange={(e) => onUpdateField('proteinPowderAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="e.g. 25"
                        className="w-full pl-4 pr-12 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">g</span>
                    </div>
                  </div>
                )}
             </div>

             {/* Specific Food Preferences */}
             <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <label className="block text-sm font-medium text-slate-200/90 flex items-center gap-2">
                    <span>📝</span> Specific Food Inclusions / Exclusions
                </label>
                <textarea
                  value={specificFoodPreferences || ''}
                  onChange={(e) => onUpdateField('specificFoodPreferences', e.target.value)}
                  placeholder="e.g. Include oats for breakfast, exclude mushrooms. I hate bell peppers."
                  rows={3}
                  className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder-slate-500/50"
                />
                <p className="text-xs text-slate-400/70">
                    The AI will treat these as strict rules for your diet plan.
                </p>
             </div>

             <div className="grid grid-cols-2 gap-3">
                 <GlassSelect
                   label="Cooking Level"
                   value={cookingLevel || 'Moderate'}
                   options={[
                      { value: 'Full Prep', label: 'Full Prep' },
                      { value: 'Moderate', label: 'Moderate' },
                      { value: 'Minimal', label: 'Minimal' },
                      { value: 'No Cooking', label: 'No Cooking' },
                   ] as any}
                   onChange={(v) => onUpdateField('cookingLevel', v)}
                 />
                 <GlassSelect
                   label="Budget"
                   value={budget || 'Standard'}
                   options={[
                      { value: 'Budget-Friendly', label: 'Budget-Friendly' },
                      { value: 'Standard', label: 'Standard' },
                      { value: 'Premium', label: 'Premium' },
                   ] as any}
                   onChange={(v) => onUpdateField('budget', v)}
                 />
             </div>
          </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={onSaveProfile}
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>

      {/* Reset Button */}
      <button
        onClick={onResetRoutines}
        className="w-full py-2.5 px-4 rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-300 text-sm font-medium transition border border-red-500/30"
      >
        Reset Routine Data
      </button>
    </div>
  )
}
