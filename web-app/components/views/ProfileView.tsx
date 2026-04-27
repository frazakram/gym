'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LogOut, ChevronRight, Settings, Camera, Dumbbell, CheckCircle, AlertCircle, Globe } from 'lucide-react'
import { Profile, GymPhoto, GymEquipmentAnalysis, BodyPhoto, BodyCompositionAnalysis } from '@/types'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { Chip } from '../ui/Chip'
import { AnimatedButton, IconButton } from '../ui/AnimatedButton'
import { Collapsible } from '../ui/Collapsible'
import { UserAvatar } from '../ui/UserAvatar'
import { ImageUploadCard } from '../ui/ImageUploadCard'

const COUNTRIES = [
  { code: 'IN', name: 'India', flag: '🇮🇳' }, { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' }, { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' }, { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' }, { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' }, { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'CN', name: 'China', flag: '🇨🇳' }, { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' }, { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' }, { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' }, { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' }, { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' }, { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' }, { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' }, { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' }, { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' }, { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' }, { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' }, { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' }, { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' }, { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' }, { code: 'RU', name: 'Russia', flag: '🇷🇺' },
]

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

interface ProfileViewProps {
  profile: (Profile & { username?: string }) | null
  isAdmin?: boolean
  onOpenAdminCoachBookings?: () => void
  name?: string
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
  sessionDuration: number | ''
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
  nationality: string
  resolvedHeightCm: number | null
  // Gym Photos
  gymPhotos?: GymPhoto[]
  equipmentAnalysis?: GymEquipmentAnalysis | null
  onGymPhotoUpload?: (files: File[]) => Promise<void>
  onGymPhotoDelete?: (id: string) => void
  analyzingEquipment?: boolean
  equipmentError?: string
  // Body Photos
  bodyPhotos?: BodyPhoto[]
  bodyAnalysis?: BodyCompositionAnalysis | null
  onBodyPhotoUpload?: (files: File[]) => Promise<void>
  onBodyPhotoDelete?: (id: string) => void
  analyzingBody?: boolean
  bodyError?: string
  onUpdateField: (field: string, value: unknown) => void
  onSaveProfile: (e: React.FormEvent) => void
  onResetRoutines: () => void
  onLogout: () => void
  loading: boolean
  onOpenCoachApply?: () => void
  onOpenCoachPortal?: () => void
}

export function ProfileView({
  profile,
  isAdmin,
  onOpenAdminCoachBookings,
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
  sessionDuration,
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
  nationality,
  resolvedHeightCm,
  gymPhotos = [],
  equipmentAnalysis,
  onGymPhotoUpload,
  onGymPhotoDelete,
  analyzingEquipment = false,
  equipmentError,
  bodyPhotos = [],
  bodyAnalysis,
  onBodyPhotoUpload,
  onBodyPhotoDelete,
  analyzingBody = false,
  bodyError,
  onUpdateField,
  onSaveProfile,
  onResetRoutines,
  onLogout,
  loading,
  onOpenCoachApply,
  onOpenCoachPortal,
}: ProfileViewProps) {
  const [advancedNutritionOpen, setAdvancedNutritionOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [gymPhotosOpen, setGymPhotosOpen] = useState(false)
  const [bodyPhotosOpen, setBodyPhotosOpen] = useState(false)

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

  return (
    <motion.form onSubmit={onSaveProfile} className="pb-24 px-4 pt-5 space-y-4 view-transition" variants={stagger} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={name || undefined} username={profile?.username} size={56} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-white truncate font-display">
              {name || profile?.username || 'Profile'}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {age || '—'} yrs • {gender}
            </p>
          </div>
          <IconButton onClick={onLogout} ariaLabel="Logout" className="hover:bg-red-500/10 hover:text-red-200">
            <LogOut className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="glass-soft rounded-2xl border border-primary/10 p-2 text-center">
            <p className="text-[16px] font-semibold text-white">{weight || '—'}</p>
            <p className="text-xs text-muted mt-0.5">kg</p>
          </div>
          <div className="glass-soft rounded-2xl border border-primary/10 p-2 text-center">
            <p className="text-[16px] font-semibold text-white">{resolvedHeightCm || '—'}</p>
            <p className="text-xs text-muted mt-0.5">cm</p>
          </div>
          <div className="glass-soft rounded-2xl border border-primary/10 p-2 text-center">
            <p className="text-[14px] font-semibold text-white">{level}</p>
            <p className="text-xs text-muted mt-0.5">level</p>
          </div>
        </div>
      </GlassCard>
      </motion.div>

      {/* Admin tools */}
      {isAdmin ? (
        <motion.div variants={fadeUp}>
        <GlassCard className="p-4">
          <SectionHeader title="Admin tools" subtitle="Manage coach booking requests" />
          <div className="mt-3">
            <AnimatedButton
              type="button"
              variant="secondary"
              fullWidth
              onClick={onOpenAdminCoachBookings}
            >
              Open Coach Bookings Admin
            </AnimatedButton>
            <div className="mt-2">
              <AnimatedButton
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => (window.location.href = '/admin/coach-approvals')}
              >
                Coach Approvals (Admin)
              </AnimatedButton>
            </div>
            <p className="mt-2 text-xs text-muted">
              You can update booking status: pending → confirmed/cancelled/completed.
            </p>
          </div>
        </GlassCard>
        </motion.div>
      ) : null}

      {/* Coach tools */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <SectionHeader title="Coach" subtitle="Apply to be listed as a coach" />
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <AnimatedButton type="button" variant="secondary" fullWidth onClick={onOpenCoachApply}>
            Apply as coach
          </AnimatedButton>
          <AnimatedButton type="button" variant="ghost" fullWidth onClick={onOpenCoachPortal}>
            Coach portal
          </AnimatedButton>
        </div>
        <p className="mt-2 text-xs text-muted">
          Open signup is enabled, but you must be approved by admin before users can see your profile.
        </p>
      </GlassCard>
      </motion.div>

      {/* Fitness */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <SectionHeader title="Fitness" subtitle="Set the basics that drive your plan" />

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-muted mb-2">Goal</p>
            <div className="flex flex-wrap gap-2">
              {goalOptions.map((g) => (
                <Chip key={g} selected={goal === g} onClick={() => onUpdateField('goal', g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-2">Level</p>
            <div className="flex flex-wrap gap-2">
              {levelOptions.map((l) => (
                <Chip key={l} selected={level === l} onClick={() => onUpdateField('level', l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-2">Gender</p>
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
      </motion.div>

      {/* Location / Nationality */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <SectionHeader
          title="Location"
          subtitle="Sets your region for community leaderboards"
          right={<Globe className="w-4 h-4 text-primary-light" />}
        />
        <div className="mt-4">
          {nationality && (() => {
            const c = COUNTRIES.find(x => x.code === nationality)
            return c ? (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-2xl">{c.flag}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-muted">Current country</p>
                </div>
              </div>
            ) : null
          })()}
          <select
            value={nationality}
            onChange={(e) => onUpdateField('nationality', e.target.value)}
            className="w-full px-4 py-3 glass-soft rounded-2xl text-white bg-transparent border border-primary/10 ui-focus-ring appearance-none"
          >
            <option value="">Select your country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            Saved with your profile. Used to auto-join your regional community.
          </p>
        </div>
      </GlassCard>
      </motion.div>

      {/* Body metrics */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <SectionHeader title="Body" subtitle="Used for calorie and training estimates" />

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-muted mb-2">Display Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onUpdateField('name', e.target.value)}
              placeholder={profile?.username?.split('@')[0] || 'Your Name'}
              className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-muted/50 ui-focus-ring border border-primary/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-2">Age</label>
              <input
                inputMode="numeric"
                type="number"
                value={age}
                onChange={(e) => onUpdateField('age', e.target.value === '' ? '' : Number(e.target.value))}
                min="16"
                max="100"
                className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-2">Weight (kg)</label>
              <input
                inputMode="decimal"
                type="number"
                value={weight}
                onChange={(e) => onUpdateField('weight', e.target.value === '' ? '' : Number(e.target.value))}
                min="30"
                max="300"
                step="0.1"
                className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted mb-2">Height unit</p>
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
              <label className="block text-xs text-muted mb-2">Height (cm)</label>
              <input
                inputMode="decimal"
                type="number"
                value={height}
                onChange={(e) => onUpdateField('height', e.target.value === '' ? '' : Number(e.target.value))}
                min="100"
                max="250"
                step="0.1"
                className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-2">Feet</label>
                <input
                  inputMode="numeric"
                  type="number"
                  value={heightFeet}
                  onChange={(e) => onUpdateField('heightFeet', e.target.value === '' ? '' : Number(e.target.value))}
                  min="3"
                  max="8"
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-2">Inches</label>
                <input
                  inputMode="decimal"
                  type="number"
                  value={heightInches}
                  onChange={(e) => onUpdateField('heightInches', e.target.value === '' ? '' : Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  max="11.9"
                  step="0.1"
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10"
                />
              </div>
            </div>
          )}
        </div>
      </GlassCard>
      </motion.div>

      {/* Training */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <SectionHeader title="Training" subtitle="Helps the AI match volume and recovery" />
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-muted mb-2">Training duration</label>
            <input
              type="text"
              value={tenure}
              onChange={(e) => onUpdateField('tenure', e.target.value)}
              placeholder="e.g., Just started, 6 months, 2 years"
              className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-muted/50 ui-focus-ring border border-primary/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-2">Goal weight (kg)</label>
              <input
                inputMode="decimal"
                type="number"
                value={goalWeight}
                onChange={(e) => onUpdateField('goalWeight', e.target.value === '' ? '' : Number(e.target.value))}
                min="30"
                max="300"
                step="0.1"
                placeholder="Optional"
                className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-muted/50 ui-focus-ring border border-primary/10"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-2">Goal timeline</label>
              <input
                type="text"
                value={goalDuration}
                onChange={(e) => onUpdateField('goalDuration', e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-muted/50 ui-focus-ring border border-primary/10"
              />
            </div>
          </div>

          {/* Session Duration */}
          <div>
            <label className="block text-xs text-muted mb-2">Session duration (minutes)</label>
            <p className="text-xs text-muted mb-2">How long is each workout session? This determines exercise count.</p>
            <div className="flex flex-wrap gap-2">
              {[30, 45, 60, 90, 120].map((mins) => (
                <Chip
                  key={mins}
                  selected={sessionDuration === mins}
                  onClick={() => onUpdateField('sessionDuration', mins)}
                >
                  {mins} min
                </Chip>
              ))}
            </div>
          </div>
          <Collapsible
            open={notesOpen}
            onToggle={() => setNotesOpen(v => !v)}
            header={
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold text-white">Notes</p>
                  <p className="text-xs text-muted truncate">
                    {notes ? 'Used to avoid injuries and match preferences' : 'Add injuries, constraints, or preferences'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary" />
              </div>
            }
            className="mt-2"
          >
            <textarea
              value={notes}
              onChange={(e) => onUpdateField('notes', e.target.value)}
              rows={4}
              placeholder="Example: knee pain (avoid heavy squats), prefer dumbbells, 45 min sessions."
              className="w-full px-4 py-3 glass-soft rounded-2xl text-white placeholder:text-muted/50 ui-focus-ring border border-primary/10 resize-none"
            />
          </Collapsible>
        </div>
      </GlassCard>
      </motion.div>

      {/* Gym Equipment Photos (optional) */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <Collapsible
          open={gymPhotosOpen}
          onToggle={() => setGymPhotosOpen(v => !v)}
          header={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-white">Gym Equipment</p>
                  <p className="text-xs text-muted">Upload gym photos for equipment-aware routines</p>
                </div>
                {equipmentAnalysis && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
              </div>
              <ChevronRight className={`w-4 h-4 text-muted transition-transform ${gymPhotosOpen ? 'rotate-90' : ''}`} />
            </div>
          }
        >
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted">
              Upload 1–6 photos of your gym. AI will detect equipment and tailor exercises to what you have available.
            </p>
            {onGymPhotoUpload && onGymPhotoDelete && (
              <ImageUploadCard
                images={gymPhotos}
                maxImages={6}
                maxSizeMB={5}
                onUpload={onGymPhotoUpload}
                onDelete={onGymPhotoDelete}
                loading={analyzingEquipment}
                error={equipmentError}
              />
            )}

            {/* Equipment analysis results */}
            {equipmentAnalysis && (
              <div className="mt-3 p-3 glass-soft rounded-xl border border-primary/10 space-y-2">
                <p className="text-xs font-medium text-primary">Detected Equipment</p>
                <div className="flex flex-wrap gap-1.5">
                  {equipmentAnalysis.equipment_detected?.map((item, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-white">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                  <div>Type: <span className="text-white capitalize">{equipmentAnalysis.gym_type}</span></div>
                  <div>Space: <span className="text-white capitalize">{equipmentAnalysis.space_assessment}</span></div>
                </div>
                {equipmentAnalysis.limitations && equipmentAnalysis.limitations.length > 0 && (
                  <div className="flex items-start gap-1.5 mt-1">
                    <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300/80">{equipmentAnalysis.limitations.join('; ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Collapsible>
      </GlassCard>
      </motion.div>

      {/* Body Composition Photos (optional) */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <Collapsible
          open={bodyPhotosOpen}
          onToggle={() => setBodyPhotosOpen(v => !v)}
          header={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-white">Body Analysis</p>
                  <p className="text-xs text-muted">Upload body photos for personalized training</p>
                </div>
                {bodyAnalysis && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
              </div>
              <ChevronRight className={`w-4 h-4 text-muted transition-transform ${bodyPhotosOpen ? 'rotate-90' : ''}`} />
            </div>
          }
        >
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted">
              Upload 1–2 body photos. AI will assess body composition and personalize your routine for faster results.
            </p>
            {onBodyPhotoUpload && onBodyPhotoDelete && (
              <ImageUploadCard
                images={bodyPhotos}
                maxImages={2}
                maxSizeMB={5}
                onUpload={onBodyPhotoUpload}
                onDelete={onBodyPhotoDelete}
                loading={analyzingBody}
                error={bodyError}
              />
            )}

            {/* Body analysis results */}
            {bodyAnalysis && (
              <div className="mt-3 p-3 glass-soft rounded-xl border border-primary/10 space-y-2">
                <p className="text-xs font-medium text-primary">Analysis Results</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                  <div>Body Type: <span className="text-white capitalize">{bodyAnalysis.body_type}</span></div>
                  <div>Muscle Dev: <span className="text-white capitalize">{bodyAnalysis.muscle_development}</span></div>
                  {bodyAnalysis.estimated_body_fat_range && (
                    <div className="col-span-2">Est. Body Fat: <span className="text-white">{bodyAnalysis.estimated_body_fat_range}</span></div>
                  )}
                </div>
                {bodyAnalysis.focus_areas && bodyAnalysis.focus_areas.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-1">Focus Areas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {bodyAnalysis.focus_areas.map((area, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-white">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {bodyAnalysis.realistic_timeline && (
                  <p className="text-xs text-green-300/80">🎯 {bodyAnalysis.realistic_timeline}</p>
                )}
                {bodyAnalysis.overall_assessment && (
                  <p className="text-xs text-muted mt-1 leading-relaxed">{bodyAnalysis.overall_assessment}</p>
                )}
              </div>
            )}
          </div>
        </Collapsible>
      </GlassCard>
      </motion.div>

      {/* Nutrition preferences */}
      <motion.div variants={fadeUp}>
      <GlassCard className="p-4">
        <SectionHeader title="Nutrition" subtitle="Diet rules and meal structure" />

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-muted mb-2">Diet type</p>
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
            <p className="text-xs text-muted mb-2">Allergies (optional)</p>
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
            <p className="text-xs text-muted mb-2">Meals per day</p>
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
                  <p className="text-xs text-muted">Cuisine, protein powder, strict inclusions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary" />
              </div>
            }
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-2">Cuisine</label>
                <select
                  value={cuisine || 'No Preference'}
                  onChange={(e) => onUpdateField('cuisine', e.target.value)}
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10 bg-transparent"
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
                <p className="text-xs text-muted mb-2">Protein powder</p>
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
                  <label className="block text-xs text-muted mb-2">Protein from powder (g/day)</label>
                  <input
                    inputMode="numeric"
                    type="number"
                    value={proteinPowderAmount || ''}
                    onChange={(e) => onUpdateField('proteinPowderAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="e.g. 25"
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10"
                  />
                </div>
              ) : null}

              <div>
                <label className="block text-xs text-muted mb-2">Specific inclusions / exclusions</label>
                <textarea
                  value={specificFoodPreferences || ''}
                  onChange={(e) => onUpdateField('specificFoodPreferences', e.target.value)}
                  rows={3}
                  placeholder="Example: include oats daily, exclude mushrooms; no bell peppers."
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10 placeholder:text-muted/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-2">Cooking</label>
                  <select
                    value={cookingLevel || 'Moderate'}
                    onChange={(e) => onUpdateField('cookingLevel', e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10 bg-transparent"
                  >
                    {['Full Prep', 'Moderate', 'Minimal', 'No Cooking'].map((v) => (
                      <option key={v} value={v} className="bg-slate-900">
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-2">Budget</label>
                  <select
                    value={budget || 'Standard'}
                    onChange={(e) => onUpdateField('budget', e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-primary/10 bg-transparent"
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
      </motion.div>

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

      <Link
        href="/onboarding?reset=true"
        className="w-full py-3 px-4 rounded-2xl bg-primary/12 hover:bg-primary/20 text-white flex items-center justify-center gap-2 text-sm font-medium transition border border-primary/20 ui-focus-ring mb-3"
      >
        <Settings className="w-4 h-4" />
        Quick Re-setup (Wizard)
      </Link>

      <button
        type="button"
        onClick={onResetRoutines}
        className="w-full py-3 px-4 rounded-2xl bg-red-500/12 hover:bg-red-500/16 text-red-200 text-sm font-medium transition border border-red-500/25 ui-focus-ring"
      >
        Reset routine data
      </button>
    </motion.form>
  )
}
