'use client'

import { motion } from 'framer-motion'
import type { MacroSet, NutritionGoals } from '@/types'

/** A circular calorie ring + three macro bars, shown against the daily goal. */

interface MacroProgressProps {
  totals: MacroSet
  goals: NutritionGoals | null
}

const MACROS = [
  { key: 'protein_g', label: 'Protein', goalKey: 'protein_goal_g', color: '#00B294', track: 'rgba(0,178,148,0.14)' },
  { key: 'carb_g', label: 'Carbs', goalKey: 'carb_goal_g', color: '#F59E0B', track: 'rgba(245,158,11,0.14)' },
  { key: 'fat_g', label: 'Fat', goalKey: 'fat_goal_g', color: '#FF6F61', track: 'rgba(255,111,97,0.14)' },
] as const

function CalorieRing({ consumed, goal }: { consumed: number; goal: number | null }) {
  const size = 132
  const stroke = 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = goal && goal > 0 ? Math.min(1, consumed / goal) : 0
  const over = goal != null && consumed > goal
  const remaining = goal != null ? Math.round(goal - consumed) : null

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,178,148,0.12)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? '#FF6F61' : '#00B294'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - c * pct }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(0,178,148,0.35))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white font-display leading-none">{Math.round(consumed)}</span>
        <span className="text-[10px] text-muted mt-1">
          {goal != null ? `of ${goal} kcal` : 'kcal logged'}
        </span>
        {remaining != null && (
          <span className={`text-[11px] font-semibold mt-1 ${over ? 'text-coral' : 'text-primary-light'}`}>
            {over ? `${Math.abs(remaining)} over` : `${remaining} left`}
          </span>
        )}
      </div>
    </div>
  )
}

function MacroBar({ label, color, track, value, goal }: { label: string; color: string; track: string; value: number; goal: number | null }) {
  const pct = goal && goal > 0 ? Math.min(1, value / goal) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-medium text-white/80">{label}</span>
        <span className="text-muted tabular-nums">
          {Math.round(value)}{goal != null ? ` / ${goal}` : ''} g
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: track }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function MacroProgress({ totals, goals }: MacroProgressProps) {
  return (
    <div className="flex items-center gap-5">
      <CalorieRing consumed={totals.calories} goal={goals?.daily_calorie_goal ?? null} />
      <div className="flex-1 space-y-3 min-w-0">
        {MACROS.map((m) => (
          <MacroBar
            key={m.key}
            label={m.label}
            color={m.color}
            track={m.track}
            value={totals[m.key]}
            goal={(goals?.[m.goalKey] as number | null) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
