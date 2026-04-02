'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Moon, Droplets, Wind, StretchHorizontal, Heart, Brain } from 'lucide-react'
import { GlassCard } from './GlassCard'
import type { WeeklyRoutine } from '@/types'

interface RestDayCardProps {
  routine: WeeklyRoutine
  todayIndex: number
}

// Recovery content library — picks based on what was trained recently
const RECOVERY_CATEGORIES = [
  {
    id: 'mobility',
    title: 'Mobility Flow',
    icon: StretchHorizontal,
    color: 'text-[#22D3EE]',
    bgColor: 'bg-[#22D3EE]/10 border-[#22D3EE]/20',
    routines: [
      { name: 'Hip Opener Sequence', duration: '10 min', steps: ['90/90 hip switches (1 min each side)', 'Pigeon pose hold (90s each)', 'Deep squat hold (2 min)', 'Cossack squats (10 each side)'] },
      { name: 'Shoulder & T-Spine Flow', duration: '8 min', steps: ['Thread the needle (10 each side)', 'Wall slides (15 reps)', 'Cat-cow (20 reps)', 'Band pull-aparts (20 reps)'] },
      { name: 'Ankle & Knee Mobility', duration: '8 min', steps: ['Ankle circles (20 each direction)', 'Wall ankle stretches (1 min each)', 'Quad foam roll (2 min each)', 'Standing calf raises (20 slow reps)'] },
    ],
  },
  {
    id: 'stretching',
    title: 'Active Stretching',
    icon: Wind,
    color: 'text-[#A78BFA]',
    bgColor: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20',
    routines: [
      { name: 'Full Body Unwind', duration: '15 min', steps: ['Standing forward fold (1 min)', 'World\'s greatest stretch (5 each)', 'Lying spinal twist (1 min each)', 'Child\'s pose (2 min)'] },
      { name: 'Upper Body Release', duration: '10 min', steps: ['Doorway chest stretch (1 min each)', 'Cross-body shoulder stretch (45s each)', 'Tricep overhead stretch (45s each)', 'Neck rolls (10 each direction)'] },
      { name: 'Lower Body Restore', duration: '12 min', steps: ['Standing quad stretch (1 min each)', 'Seated hamstring stretch (1 min each)', 'Butterfly stretch (2 min)', 'Lying glute stretch (1 min each)'] },
    ],
  },
  {
    id: 'breathwork',
    title: 'Breathwork & Recovery',
    icon: Brain,
    color: 'text-[#10B981]',
    bgColor: 'bg-[#10B981]/10 border-[#10B981]/20',
    routines: [
      { name: 'Box Breathing', duration: '5 min', steps: ['Inhale 4 counts', 'Hold 4 counts', 'Exhale 4 counts', 'Hold 4 counts', 'Repeat for 5 minutes'] },
      { name: '4-7-8 Relaxation', duration: '5 min', steps: ['Inhale through nose (4 counts)', 'Hold breath (7 counts)', 'Exhale through mouth (8 counts)', '6-8 cycles total'] },
      { name: 'Wim Hof Intro', duration: '10 min', steps: ['30 deep breaths (in nose, out mouth)', 'Exhale and hold (as long as comfortable)', 'Recovery breath: inhale, hold 15s', '3 rounds total'] },
    ],
  },
  {
    id: 'hydration',
    title: 'Hydration & Nutrition',
    icon: Droplets,
    color: 'text-[#60A5FA]',
    bgColor: 'bg-[#60A5FA]/10 border-[#60A5FA]/20',
    routines: [
      { name: 'Rest Day Hydration Plan', duration: 'All day', steps: ['500ml water on waking', '250ml before each meal', 'Add electrolytes if training was intense yesterday', 'Target: 2.5-3L total today'] },
    ],
  },
  {
    id: 'sleep',
    title: 'Sleep Optimization',
    icon: Moon,
    color: 'text-[#F59E0B]',
    bgColor: 'bg-[#F59E0B]/10 border-[#F59E0B]/20',
    routines: [
      { name: 'Wind-Down Protocol', duration: '30 min before bed', steps: ['No screens 30 min before bed', 'Room temperature: 18-20\u00B0C', '10 min of reading or light stretching', 'Magnesium supplement (if applicable)'] },
    ],
  },
]

// Detect which muscle groups were trained this week (before today)
function getRecentMuscleGroups(routine: WeeklyRoutine, todayIndex: number): string[] {
  const muscles = new Set<string>()
  const keywords: Record<string, string[]> = {
    'chest': ['chest', 'bench', 'push-up', 'pushup', 'fly', 'pec'],
    'back': ['back', 'row', 'pull', 'lat', 'deadlift'],
    'legs': ['leg', 'squat', 'lunge', 'calf', 'hamstring', 'quad', 'glute'],
    'shoulders': ['shoulder', 'press', 'delt', 'lateral raise', 'overhead'],
    'arms': ['bicep', 'tricep', 'curl', 'arm', 'hammer'],
    'core': ['core', 'ab', 'plank', 'crunch', 'oblique'],
  }

  for (let i = 0; i < todayIndex && i < routine.days.length; i++) {
    const day = routine.days[i]
    for (const ex of day.exercises || []) {
      const nameLower = (ex.name + ' ' + (day.day || '')).toLowerCase()
      for (const [group, keys] of Object.entries(keywords)) {
        if (keys.some((k) => nameLower.includes(k))) {
          muscles.add(group)
        }
      }
    }
  }
  return [...muscles]
}

export function RestDayCard({ routine, todayIndex }: RestDayCardProps) {
  const todaysPlan = routine?.days?.[Math.min(todayIndex, (routine.days?.length || 1) - 1)]
  const isRestDay = !todaysPlan?.exercises?.length

  // Pick 3 recovery categories based on day and what was trained
  const selectedContent = useMemo(() => {
    if (!isRestDay) return []
    const recentMuscles = getRecentMuscleGroups(routine, todayIndex)

    // Always include mobility and one of stretching/breathwork
    const selected = [RECOVERY_CATEGORIES[0]] // mobility

    // If legs were trained, prioritize lower body stretching
    if (recentMuscles.includes('legs')) {
      selected.push(RECOVERY_CATEGORIES[1]) // stretching
    } else {
      selected.push(RECOVERY_CATEGORIES[2]) // breathwork
    }

    // Add hydration or sleep based on day
    selected.push(RECOVERY_CATEGORIES[todayIndex % 2 === 0 ? 3 : 4])

    // Pick a specific routine from each category (rotate by day)
    return selected.map((cat) => ({
      ...cat,
      selectedRoutine: cat.routines[todayIndex % cat.routines.length],
    }))
  }, [isRestDay, routine, todayIndex])

  if (!isRestDay || selectedContent.length === 0) return null

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 flex items-center justify-center">
          <Heart className="w-4 h-4 text-[#A78BFA]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white font-[family-name:var(--font-display)]">
            Rest Day Recovery
          </h3>
          <p className="text-[10px] text-[#8B8DA3]">Active recovery to maximize your gains</p>
        </div>
      </div>

      <div className="space-y-3">
        {selectedContent.map((cat, idx) => {
          const Icon = cat.icon
          const r = cat.selectedRoutine
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className={`rounded-xl p-3 border ${cat.bgColor}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${cat.color}`} />
                <span className={`text-xs font-semibold ${cat.color}`}>{cat.title}</span>
                <span className="text-[10px] text-[#8B8DA3] ml-auto">{r.duration}</span>
              </div>
              <p className="text-xs font-medium text-white mb-1.5">{r.name}</p>
              <ul className="space-y-1">
                {r.steps.map((step, i) => (
                  <li key={i} className="text-[11px] text-[#8B8DA3] flex items-start gap-1.5">
                    <span className="text-[#8B5CF6]/50 mt-0.5 shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}
