'use client'

import { Moon, Droplets, StretchHorizontal, Heart } from 'lucide-react'
import { GlassCard } from './GlassCard'

const TIPS = [
  { icon: StretchHorizontal, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10', text: '10 min stretching or foam rolling' },
  { icon: Droplets, color: 'text-[#60A5FA]', bg: 'bg-[#60A5FA]/10', text: 'Stay hydrated — aim for 2.5L+ today' },
  { icon: Moon, color: 'text-gold', bg: 'bg-gold/10', text: '7-9 hours of sleep for muscle recovery' },
]

export function RestDayCard() {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Heart className="w-3.5 h-3.5 text-primary-light" />
        </div>
        <p className="text-xs font-semibold text-white">Recovery Tips</p>
      </div>
      <div className="space-y-2">
        {TIPS.map((tip, i) => {
          const Icon = tip.icon
          return (
            <div key={i} className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg ${tip.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${tip.color}`} />
              </div>
              <p className="text-xs text-primary-lighter">{tip.text}</p>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
