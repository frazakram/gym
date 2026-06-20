'use client'

import { motion } from 'framer-motion'
import { Pencil, Trash2, Camera, Barcode, Search, Hand } from 'lucide-react'
import type { FoodEntry, FoodSource } from '@/types'

const SOURCE_ICON: Record<FoodSource, React.ComponentType<{ className?: string }>> = {
  photo: Camera,
  barcode: Barcode,
  search: Search,
  manual: Hand,
}

interface FoodEntryRowProps {
  entry: FoodEntry
  onEdit: (entry: FoodEntry) => void
  onDelete: (id: number) => void
}

export function FoodEntryRow({ entry, onEdit, onDelete }: FoodEntryRowProps) {
  const Icon = SOURCE_ICON[entry.source] ?? Hand
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/4 border border-white/8"
    >
      <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary-light" />
      </span>
      <button onClick={() => onEdit(entry)} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-white truncate">{entry.name}</p>
        <p className="text-[11px] text-muted truncate">
          {formatQty(entry.quantity)} {entry.unit} · {entry.protein_g}P / {entry.carb_g}C / {entry.fat_g}F
        </p>
      </button>
      <span className="text-sm font-semibold text-white tabular-nums shrink-0">{Math.round(entry.calories)}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onEdit(entry)}
          aria-label="Edit"
          className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          aria-label="Delete"
          className="p-1.5 rounded-lg text-muted hover:text-coral hover:bg-coral/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/\.?0+$/, '')
}
