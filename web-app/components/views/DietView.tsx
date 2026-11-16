
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { WeeklyDiet } from '@/types'
import { DietDisplay } from '@/components/DietDisplay'
import { Utensils, RefreshCw } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { AnimatedButton } from '../ui/AnimatedButton'
import { QuoteLoader } from '../ui/QuoteLoader'
import { PageHero } from '../ui/PageHero'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

interface DietViewProps {
  /** Back to Eat */
  onBack?: () => void
  diet: WeeklyDiet | null
  onGenerateDiet: (isNextWeek?: boolean) => void
  generating: boolean
}

export const DietView: React.FC<DietViewProps> = ({ diet, onGenerateDiet, generating, onBack }) => {
  if (!diet) {
    return (
      <div className="pb-24">
        <PageHero title="Diet plan" subtitle="Meals built around your goal" onBack={onBack} />
        <div className="px-4 py-6 text-center">
        {generating ? (
          <QuoteLoader mode="full" category="diet" />
        ) : (
          <GlassCard className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8 text-primary-light" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 font-display">Nutrition Plan</h2>
            <p className="text-muted mb-6">
              Generate a personalized meal plan tailored to your goal, diet type (e.g., Keto, Vegan), and calorie needs.
            </p>
            <AnimatedButton onClick={onGenerateDiet} disabled={generating} loading={generating} variant="primary">
              Generate Nutrition Plan
            </AnimatedButton>
          </GlassCard>
        )}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
    <PageHero
      title="Diet plan"
      onBack={onBack}
      subtitle="Weekly plan with calories and protein highlighted"
      right={
        <button type="button" onClick={() => onGenerateDiet()} disabled={generating} className="gb-hero-action gb-press">
          <RefreshCw className={generating ? 'gb-spin' : undefined} aria-hidden="true" />
          {generating ? 'Generating...' : 'Regenerate'}
        </button>
      }
    />
    <motion.div
      className="px-4 pt-5 space-y-4 view-transition"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >

      <motion.div variants={fadeUp}>
        <DietDisplay diet={diet} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard className="p-4">
          <p className="text-sm text-muted leading-relaxed">
            This plan is based on your profile preferences. Update diet type, allergies, or meals per day in Profile.
          </p>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Manage plan</p>
              <p className="text-xs text-muted">Get ready for the upcoming week</p>
            </div>
            <AnimatedButton
              onClick={() => onGenerateDiet(true)}
              disabled={generating}
              loading={generating}
              variant="secondary"
              size="sm"
            >
              Generate Next Week
            </AnimatedButton>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
    </div>
  )
};
