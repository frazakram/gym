
'use client'

import React, { useMemo, useState } from 'react'
import { WeeklyDiet } from '@/types'
import { ChevronDown, Salad } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Collapsible } from '@/components/ui/Collapsible'

interface DietDisplayProps {
  diet: WeeklyDiet | null
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
                  ? 'bg-primary/14 border-primary/25 shadow-[0_8px_30px_rgba(139,92,246,0.1)]'
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
                        <p className={`text-sm font-semibold truncate ${isToday ? 'text-primary-dark dark:text-primary-lighter' : 'text-gray-800 dark:text-white'}`}>
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
                    <div key={j} className="flex items-center justify-between py-3">
                      <p className="text-sm text-gray-900 dark:text-white">{meal.name}</p>
                      <p className="text-sm text-gray-400">{meal.calories} kcal</p>
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
