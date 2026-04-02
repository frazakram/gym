
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { WeeklyDiet } from '@/types'
import { DietDisplay } from '@/components/DietDisplay'
import { Utensils, RefreshCw } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { AnimatedButton } from '../ui/AnimatedButton'
import { QuoteLoader } from '../ui/QuoteLoader'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

interface DietViewProps {
  diet: WeeklyDiet | null
  onGenerateDiet: (isNextWeek?: boolean) => void
  generating: boolean
}

export const DietView: React.FC<DietViewProps> = ({ diet, onGenerateDiet, generating }) => {
  if (!diet) {
    return (
      <div className="pb-24 px-4 py-6 text-center">
        {generating ? (
          <QuoteLoader mode="full" category="diet" />
        ) : (
          <GlassCard className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/12 border border-[#8B5CF6]/20 flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8 text-[#A78BFA]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 font-[family-name:var(--font-display)]">Nutrition Plan</h2>
            <p className="text-[#8B8DA3] mb-6">
              Generate a personalized meal plan tailored to your goal, diet type (e.g., Keto, Vegan), and calorie needs.
            </p>
            <AnimatedButton onClick={onGenerateDiet} disabled={generating} loading={generating} variant="primary">
              Generate diet plan
            </AnimatedButton>
          </GlassCard>
        )}
      </div>
    )
  }

  return (
    <motion.div
      className="pb-24 px-4 pt-5 space-y-4 view-transition"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <SectionHeader
          title="Nutrition"
          subtitle="Weekly plan with calories and protein highlighted"
          right={
            <button
              onClick={() => onGenerateDiet()}
              disabled={generating}
              className="text-[11px] px-3 py-1.5 rounded-full btn-secondary disabled:opacity-50 transition ui-focus-ring inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {generating ? 'Refreshing…' : 'Regenerate'}
            </button>
          }
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <DietDisplay diet={diet} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard className="p-4">
          <p className="text-sm text-[#8B8DA3] leading-relaxed">
            This plan is based on your profile preferences. Update diet type, allergies, or meals per day in Profile.
          </p>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Manage plan</p>
              <p className="text-xs text-[#8B8DA3]">Get ready for the upcoming week</p>
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
  )
};
