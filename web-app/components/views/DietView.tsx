
'use client'

import React from 'react'
import { WeeklyDiet } from '@/types'
import { DietDisplay } from '@/components/DietDisplay'
import { Utensils } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { AnimatedButton } from '../ui/AnimatedButton'

interface DietViewProps {
  diet: WeeklyDiet | null
  onGenerateDiet: (isNextWeek?: boolean) => void
  generating: boolean
}

export const DietView: React.FC<DietViewProps> = ({ diet, onGenerateDiet, generating }) => {
  if (!diet) {
    return (
      <div className="pb-24 px-4 py-6 text-center">
        <GlassCard className="p-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-400/12 border border-emerald-400/20 flex items-center justify-center mb-4">
            <Utensils className="w-8 h-8 text-emerald-200" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Nutrition Plan</h2>
          <p className="text-slate-300/70 mb-6">
            Generate a personalized meal plan tailored to your goal, diet type (e.g., Keto, Vegan), and calorie needs.
          </p>
          <AnimatedButton onClick={onGenerateDiet} disabled={generating} loading={generating} variant="primary">
            {generating ? 'Generating plan...' : 'Generate diet plan'}
          </AnimatedButton>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="pb-24 px-4 pt-5 space-y-4 view-transition">
      <SectionHeader
        title="Nutrition"
        subtitle="Weekly plan with calories and protein highlighted"
        right={
          <button
            onClick={() => onGenerateDiet()}
            disabled={generating}
            className="text-[11px] px-3 py-1.5 rounded-full btn-secondary disabled:opacity-50 transition ui-focus-ring"
          >
            {generating ? 'Refreshing…' : 'Regenerate'}
          </button>
        }
      />

      <DietDisplay diet={diet} />

      <GlassCard className="p-4">
        <p className="text-sm text-slate-300/80 leading-relaxed">
          This plan is based on your profile preferences. Update diet type, allergies, or meals per day in Profile.
        </p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Manage plan</p>
            <p className="text-xs text-slate-300/70">Get ready for the upcoming week</p>
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
    </div>
  )
};
