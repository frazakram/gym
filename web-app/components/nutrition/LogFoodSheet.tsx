'use client'

import { Search, Barcode, Camera, PencilLine } from 'lucide-react'
import { SheetModal } from './SheetModal'

export type LogMethod = 'search' | 'barcode' | 'photo' | 'manual'

interface LogFoodSheetProps {
  open: boolean
  onClose: () => void
  onPick: (method: LogMethod) => void
}

const METHODS: { id: LogMethod; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { id: 'photo', label: 'Scan a meal', hint: 'Photo recognition', icon: Camera, accent: 'from-primary/20 to-primary/5' },
  { id: 'barcode', label: 'Scan barcode', hint: 'Packaged foods', icon: Barcode, accent: 'from-amber-500/20 to-amber-500/5' },
  { id: 'search', label: 'Search foods', hint: 'Database lookup', icon: Search, accent: 'from-sky-500/20 to-sky-500/5' },
  { id: 'manual', label: 'Quick add', hint: 'Enter macros', icon: PencilLine, accent: 'from-coral/20 to-coral/5' },
]

export function LogFoodSheet({ open, onClose, onPick }: LogFoodSheetProps) {
  return (
    <SheetModal open={open} onClose={onClose} title="Log food" subtitle="Choose how to add your food">
      <div className="grid grid-cols-2 gap-3 py-1">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => onPick(m.id)}
            className={`flex flex-col items-start gap-3 p-4 rounded-2xl border border-white/10 bg-gradient-to-br ${m.accent} hover:border-primary/30 transition-colors active:scale-[0.98]`}
          >
            <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
              <m.icon className="w-5 h-5 text-white" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-white">{m.label}</span>
              <span className="block text-[11px] text-muted">{m.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </SheetModal>
  )
}
