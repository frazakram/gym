
import React, { useMemo, useState } from 'react'
import { WeeklyDiet } from '@/types'
import { ChevronDown, Flame, Salad, Utensils } from 'lucide-react'
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
    <GlassCard className="w-full p-4">
      <SectionHeader
        title="Weekly meal plan"
        subtitle="Tap a day to expand meals and macros"
        right={
          <div className="w-9 h-9 rounded-2xl bg-emerald-400/12 border border-emerald-400/20 flex items-center justify-center text-emerald-200">
            <Salad className="w-5 h-5" />
          </div>
        }
      />

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass-soft rounded-2xl border border-white/10 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-300/70">Avg calories/day</p>
            <Flame className="w-4 h-4 text-orange-300/90" />
          </div>
          <p className="mt-1 text-[20px] font-semibold tracking-tight text-white">
            {summary.avgCalories}
            <span className="ml-1 text-xs text-slate-300/70">kcal</span>
          </p>
        </div>
        <div className="glass-soft rounded-2xl border border-emerald-400/20 p-3 bg-emerald-400/6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-300/70">Avg protein/day</p>
            <Utensils className="w-4 h-4 text-emerald-200/90" />
          </div>
          <p className="mt-1 text-[20px] font-semibold tracking-tight text-white">
            {summary.avgProtein}
            <span className="ml-1 text-xs text-slate-300/70">g</span>
          </p>
        </div>
      </div>

      {/* Days accordion */}
      <div className="mt-4 space-y-2">
        {diet.days.map((day, i) => {
          const open = openDay === i
          
          // Compute weekday name
          const date = new Date()
          date.setDate(date.getDate() + i)
          const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const weekdayName = weekdayNames[date.getDay()]
          
          let displayDay = `${weekdayName}`
          if (i === 0) displayDay = `Today ${weekdayName}`
          else if (i === 1) displayDay = `Tomorrow ${weekdayName}`

          return (
            <GlassCard key={i} variant="soft" className="p-3">
              <Collapsible
                open={open}
                onToggle={() => setOpenDay(open ? null : i)}
                header={
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{displayDay}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300/70">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5">
                          🔥 {day.total_calories} kcal
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 text-emerald-100">
                          🥩 {day.total_protein}g
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </div>
                }
              >
                <div className="space-y-2">
                  {day.meals.map((meal, j) => (
                    <div
                      key={j}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white/90 truncate">{meal.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-300/70">
                            {meal.calories} kcal
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-[11px] text-slate-200/80">
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                              P {meal.protein}g
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                              C {meal.carbs}g
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                              F {meal.fats}g
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-white/70 leading-relaxed">
                        {meal.ingredients}
                      </p>
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
