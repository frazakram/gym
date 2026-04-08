'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Dumbbell, Target, User, Ruler, Sparkles, Clock, Calendar } from 'lucide-react'
import { Profile } from '@/types'
import { GlassCard } from '@/components/ui/GlassCard'
import { Chip } from '@/components/ui/Chip'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { BrandLogo } from '@/components/BrandLogo'
import { csrfFetch } from '@/lib/useCsrf'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const goalOptions: { label: string; value: Profile['goal']; icon: string }[] = [
  { label: 'Fat Loss', value: 'Fat loss', icon: '🔥' },
  { label: 'Muscle Gain', value: 'Muscle gain', icon: '💪' },
  { label: 'Strength', value: 'Strength', icon: '🏋️' },
  { label: 'Recomposition', value: 'Recomposition', icon: '⚡' },
  { label: 'Endurance', value: 'Endurance', icon: '🏃' },
  { label: 'General Fitness', value: 'General fitness', icon: '🎯' },
]

const levelOptions: { label: string; value: 'Beginner' | 'Regular' | 'Expert'; desc: string }[] = [
  { label: 'Beginner', value: 'Beginner', desc: 'New to the gym' },
  { label: 'Regular', value: 'Regular', desc: '6+ months training' },
  { label: 'Expert', value: 'Expert', desc: '2+ years consistent' },
]

const genderOptions: { label: string; value: Profile['gender']; icon: string }[] = [
  { label: 'Male', value: 'Male', icon: '♂️' },
  { label: 'Female', value: 'Female', icon: '♀️' },
  { label: 'Non-binary', value: 'Non-binary', icon: '⚧️' },
  { label: 'Prefer not to say', value: 'Prefer not to say', icon: '🤐' },
]

const tenureOptions = [
  { label: 'Just starting', value: 'Just starting' },
  { label: '< 6 months', value: 'Less than 6 months' },
  { label: '6–12 months', value: '6-12 months' },
  { label: '1–2 years', value: '1-2 years' },
  { label: '2+ years', value: 'More than 2 years' },
]

const sessionOptions = [30, 45, 60, 90, 120]

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.96,
  }),
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' as const },
  }),
}

/* ================================================================== */
/*  COMPONENT                                                          */
/* ================================================================== */

export default function OnboardingWizard({ isReset = false }: { isReset?: boolean }) {
  const router = useRouter()

  /* ---------- state ---------- */
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Screen 1 — Your Goal
  const [goal, setGoal] = useState<Profile['goal']>('General fitness')
  const [level, setLevel] = useState<'Beginner' | 'Regular' | 'Expert'>('Beginner')
  const [gender, setGender] = useState<Profile['gender']>('Prefer not to say')

  // Screen 2 — Your Body
  const [age, setAge] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>('')
  const [height, setHeight] = useState<number | ''>('')

  // Screen 3 — Your Experience
  const [tenure, setTenure] = useState('Just starting')
  const [sessionDuration, setSessionDuration] = useState(60)

  /* ---------- validation ---------- */
  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return !!goal && !!level && !!gender
      case 1:
        return age !== '' && weight !== '' && height !== ''
          && Number(age) >= 16 && Number(age) <= 100
          && Number(weight) >= 30 && Number(weight) <= 300
          && Number(height) >= 100 && Number(height) <= 250
      case 2:
        return !!tenure
      default:
        return false
    }
  }, [step, goal, level, gender, age, weight, height, tenure])

  /* ---------- navigation ---------- */
  const goNext = useCallback(() => {
    if (step < 2) {
      setDirection(1)
      setStep(s => s + 1)
    }
  }, [step])

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1)
      setStep(s => s - 1)
    }
  }, [step])

  /* ---------- submit ---------- */
  const handleSubmit = async () => {
    if (!canProceed) return
    setSaving(true)
    setError('')

    try {
      const response = await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: Number(age),
          weight: Number(weight),
          height: Number(height),
          gender,
          goal,
          level,
          tenure,
          session_duration: sessionDuration,
          diet_type: ['No Restrictions'],
          meals_per_day: 3,
          cuisine: 'No Preference',
          protein_powder: 'No',
          cooking_level: 'Moderate',
          budget: 'Standard',
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save profile')
      }

      // Profile saved — go to dashboard
      router.replace('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  /* ---------- step labels ---------- */
  const steps = ['Your Goal', 'Your Body', 'Your Experience']

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-10 pb-20 relative overflow-hidden">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center mb-6"
      >
        <BrandLogo size={56} className="mb-3" />
        <h1 className="text-2xl font-bold tracking-tight text-white font-display">
          {isReset ? 'Re-setup your profile' : "Let's set you up"}
        </h1>
        <p className="text-sm text-muted mt-1">
          {isReset ? 'Update your basics in 3 quick steps' : '~40 seconds to your first routine'}
        </p>
      </motion.div>

      {/* ---- Progress bar ---- */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-full max-w-md mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          {steps.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                  i <= step
                    ? 'bg-gradient-to-r from-primary to-primary-light shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                    : 'bg-white/8'
                }`}
              />
              <span className={`text-xs font-medium transition-colors duration-300 ${
                i <= step ? 'text-primary-lighter' : 'text-muted'
              }`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ---- Step content ---- */}
      <div className="w-full max-w-md relative" style={{ minHeight: 400 }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full"
          >
            {/* ============ STEP 0: Your Goal ============ */}
            {step === 0 && (
              <div className="space-y-5">
                {/* Goal */}
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
                        <Target className="w-4 h-4 text-primary-light" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">What&apos;s your goal?</p>
                        <p className="text-xs text-muted">Pick the one that matters most</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {goalOptions.map((g) => (
                        <Chip
                          key={g.value}
                          selected={goal === g.value}
                          onClick={() => setGoal(g.value)}
                          icon={<span>{g.icon}</span>}
                          className="justify-start !rounded-xl py-2.5"
                        >
                          {g.label}
                        </Chip>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Level */}
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-xl bg-brand-cyan/15 border border-brand-cyan/20">
                        <Dumbbell className="w-4 h-4 text-brand-cyan-light" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Fitness level</p>
                        <p className="text-xs text-muted">Be honest — we&apos;ll match intensity</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {levelOptions.map((l) => (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => setLevel(l.value)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                            level === l.value
                              ? 'border-primary/40 bg-primary/15 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                              : 'border-primary/10 bg-white/5 hover:bg-primary/8'
                          }`}
                        >
                          <span className={`text-sm font-medium ${level === l.value ? 'text-primary-lighter' : 'text-slate-300'}`}>
                            {l.label}
                          </span>
                          <span className="text-xs text-muted">{l.desc}</span>
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Gender */}
                <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-xl bg-accent/15 border border-accent/20">
                        <User className="w-4 h-4 text-accent-2" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Gender</p>
                        <p className="text-xs text-muted">Helps tailor calorie estimates</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {genderOptions.map((g) => (
                        <Chip
                          key={g.value}
                          selected={gender === g.value}
                          onClick={() => setGender(g.value)}
                          icon={<span>{g.icon}</span>}
                        >
                          {g.label}
                        </Chip>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              </div>
            )}

            {/* ============ STEP 1: Your Body ============ */}
            {step === 1 && (
              <div className="space-y-5">
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="p-2 rounded-xl bg-gold/15 border border-gold/20">
                        <Ruler className="w-4 h-4 text-gold-light" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Body measurements</p>
                        <p className="text-xs text-muted">Used for calorie &amp; training estimates</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Age */}
                      <div>
                        <label className="block text-xs text-muted mb-2 font-medium">Age</label>
                        <div className="relative">
                          <input
                            id="onboarding-age"
                            inputMode="numeric"
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                            min="16"
                            max="100"
                            placeholder="e.g. 25"
                            className="w-full px-4 py-3.5 glass-soft rounded-xl text-white placeholder:text-muted/40 ui-focus-ring border border-primary/10 text-lg font-medium"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">years</span>
                        </div>
                      </div>

                      {/* Weight */}
                      <div>
                        <label className="block text-xs text-muted mb-2 font-medium">Weight</label>
                        <div className="relative">
                          <input
                            id="onboarding-weight"
                            inputMode="decimal"
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            min="30"
                            max="300"
                            step="0.1"
                            placeholder="e.g. 70"
                            className="w-full px-4 py-3.5 glass-soft rounded-xl text-white placeholder:text-muted/40 ui-focus-ring border border-primary/10 text-lg font-medium"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">kg</span>
                        </div>
                      </div>

                      {/* Height */}
                      <div>
                        <label className="block text-xs text-muted mb-2 font-medium">Height</label>
                        <div className="relative">
                          <input
                            id="onboarding-height"
                            inputMode="decimal"
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                            min="100"
                            max="250"
                            step="0.1"
                            placeholder="e.g. 170"
                            className="w-full px-4 py-3.5 glass-soft rounded-xl text-white placeholder:text-muted/40 ui-focus-ring border border-primary/10 text-lg font-medium"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">cm</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Friendly tip */}
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/8 border border-primary/15">
                    <Sparkles className="w-4 h-4 text-primary-light mt-0.5 shrink-0" />
                    <p className="text-xs text-primary-lighter/80 leading-relaxed">
                      Don&apos;t worry about being exact — you can always fine-tune these later in your profile.
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ============ STEP 2: Your Experience ============ */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Tenure */}
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
                        <Calendar className="w-4 h-4 text-primary-light" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">How long have you been training?</p>
                        <p className="text-xs text-muted">Helps us match volume &amp; recovery</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {tenureOptions.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTenure(t.value)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                            tenure === t.value
                              ? 'border-primary/40 bg-primary/15 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                              : 'border-primary/10 bg-white/5 hover:bg-primary/8'
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            tenure === t.value ? 'text-primary-lighter' : 'text-slate-300'
                          }`}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Session duration */}
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-xl bg-brand-cyan/15 border border-brand-cyan/20">
                        <Clock className="w-4 h-4 text-brand-cyan-light" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Session duration</p>
                        <p className="text-xs text-muted">How long is each workout?</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sessionOptions.map((mins) => (
                        <Chip
                          key={mins}
                          selected={sessionDuration === mins}
                          onClick={() => setSessionDuration(mins)}
                          className="!rounded-xl"
                        >
                          {mins} min
                        </Chip>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Error display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ---- Bottom navigation ---- */}
      <div className="w-full max-w-md mt-8 flex gap-3">
        {step > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="shrink-0"
          >
            <AnimatedButton
              type="button"
              variant="secondary"
              onClick={goBack}
              icon={<ArrowLeft className="w-4 h-4" />}
              className="!rounded-xl"
            >
              Back
            </AnimatedButton>
          </motion.div>
        )}

        <div className="flex-1">
          {step < 2 ? (
            <AnimatedButton
              type="button"
              variant="primary"
              fullWidth
              disabled={!canProceed}
              onClick={goNext}
              icon={<ArrowRight className="w-4 h-4" />}
              className="!rounded-xl"
            >
              Continue
            </AnimatedButton>
          ) : (
            <AnimatedButton
              type="button"
              variant="coral"
              fullWidth
              disabled={!canProceed || saving}
              loading={saving}
              onClick={handleSubmit}
              icon={!saving ? <Sparkles className="w-4 h-4" /> : undefined}
              className="!rounded-xl !text-base !py-4"
            >
              {saving ? 'Setting up...' : 'Generate My Routine →'}
            </AnimatedButton>
          )}
        </div>
      </div>

      {/* ---- Skip link ---- */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        type="button"
        onClick={() => router.replace('/dashboard')}
        className="mt-4 text-xs text-muted hover:text-muted transition-colors"
      >
        Skip for now — I&apos;ll fill this in later
      </motion.button>
    </div>
  )
}
