
'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { WeeklyDiet, Meal } from '@/types'
import { ChevronDown, Salad, Plus, Check, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Collapsible } from '@/components/ui/Collapsible'
import { csrfFetch } from '@/lib/useCsrf'
import { toastSuccess, toastError } from '@/lib/toast'
import { todayStr } from '@/hooks/useNutrition'

interface DietDisplayProps {
  diet: WeeklyDiet | null
}

type LogState = 'idle' | 'logging' | 'done'

/** Inline button to drop a planned meal straight into today's food log. */
function LogMealButton({ meal }: { meal: Meal }) {
  const [state, setState] = useState<LogState>('idle')

  const log = async () => {
    if (state !== 'idle') return
    setState('logging')
    try {
      const res = await csrfFetch('/api/nutrition/food-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: todayStr(),
          source: 'manual',
          name: meal.name,
          calories: Math.max(0, Math.round(meal.calories || 0)),
          protein_g: Math.max(0, meal.protein || 0),
          carb_g: Math.max(0, meal.carbs || 0),
          fat_g: Math.max(0, meal.fats || 0),
          quantity: 1,
          unit: 'serving',
        }),
      })
      if (!res.ok) throw new Error()
      setState('done')
      toastSuccess('Added to today', `${meal.name} logged to your tracker`)
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('idle')
      toastError('Could not log meal', 'Try again in a moment.')
    }
  }

  return (
    <motion.button
      onClick={log}
      disabled={state !== 'idle'}
      aria-label={`Log ${meal.name} to tracker`}
      whileTap={state === 'idle' ? { scale: 0.95 } : undefined}
      animate={state === 'done' ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
        state === 'done'
          ? 'border-primary/40 bg-primary/15 text-primary-light'
          : 'border-primary/25 text-primary-light hover:bg-primary/10'
      }`}
    >
      {state === 'logging' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : state === 'done' ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Plus className="w-3.5 h-3.5" />
      )}
      {state === 'done' ? 'Logged' : 'Log'}
    </motion.button>
  )
}

export const DietDisplay: React.FC<DietDisplayProps> = ({ diet }) => {
  const [openDay, setOpenDay] = useState<number | null>(0)

  const summary = useMemo(() => {
    if (!diet?.days?.length) {
      return { totalCalories: 0, totalProtein: 0, avgCalories: 0, avgProtein: 0 }
    }
    const totalCalories = diet.days.reduce((sum, d) => sum + (d.total_calories || 0), 0)
    const totalProtein = diet.days.reduce((sum, d) => sum + (d.total_protein || 0), 0)
    const avgCalories = Math.round(totalCalories / diet.days.length)
    const avgProtein = Math.round(totalProtein / diet.days.length)
    return { totalCalories, totalProtein, avgCalories, avgProtein }
  }, [diet])

  if (!diet) return null

  return (
    <GlassCard className="w-full p-4 dark:bg-gray-900 dark:text-white">
      <SectionHeader
        title="Weekly meal plan"
        subtitle="Tap a day to expand meals and macros"
        right={
          <div className="w-9 h-9 rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center text-primary-light">
            <Salad className="w-5 h-5" />
          </div>
        }
      />

      {/* Summary */}
      <p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
        {summary.avgCalories} kcal · {summary.avgProtein}g protein
      </p>

      {/* Days accordion */}
      <div className="mt-4 space-y-2">
        {diet.days.map((day, i) => {
          const open = openDay === i
          
          const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          const displayDay = weekdayNames[i]
          const todayIndex = (new Date().getDay() + 6) % 7 // Mon=0
          const isToday = i === todayIndex

          return (
            <GlassCard 
              key={i} 
              variant="soft" 
              className={`p-3 transition-colors ${
                isToday
                  ? 'bg-primary/14 border-primary/25 shadow-[0_8px_30px_rgba(0,229,188,0.12)]'
                  : ''
              }`}
            >
              <Collapsible
                open={open}
                onToggle={() => setOpenDay(open ? null : i)}
                header={
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${isToday ? 'text-primary-dark dark:text-primary-lighter' : 'text-gray-800 dark:text-gray-50'}`}>
                          {displayDay}
                        </p>
                        {isToday && (
                          <span className="px-1.5 py-0.5 rounded-md bg-primary/20 border border-primary/30 text-xs font-bold text-primary-lighter tracking-wider uppercase">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-primary/10 px-2 py-0.5">
                          🔥 {day.total_calories} kcal
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                          isToday ? 'bg-emerald-400/20 border-emerald-400/30 text-emerald-100' : 'bg-emerald-400/10 border-emerald-400/20 text-emerald-100'
                        }`}>
                          🥩 {day.total_protein}g
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-primary transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </div>
                }
              >
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {day.meals.map((meal, j) => (
                    <div key={j} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{meal.name}</p>
                        <p className="text-[11px] text-muted">
                          {meal.calories} kcal · {meal.protein}P / {meal.carbs}C / {meal.fats}F
                        </p>
                      </div>
                      <LogMealButton meal={meal} />
                    </div>
                  ))}
                </div>
              </Collapsible>
            </GlassCard>
          )
        })}
      </div>
    </GlassCard>
  )
}
