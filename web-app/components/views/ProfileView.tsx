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
