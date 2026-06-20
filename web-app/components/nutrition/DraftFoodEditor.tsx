'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, Trash2, ChevronLeft, Star, Check, AlertTriangle } from 'lucide-react'
import type { DraftFoodItem, FoodSearchResult, MacroSet } from '@/types'
import { FOOD_UNITS, recomputeMacros, draftFromSearchResult, emptyMacros, addMacros } from '@/lib/nutrition/scale'
import { FoodSearchPanel } from './FoodSearchPanel'

interface DraftFoodEditorProps {
  initialItems: DraftFoodItem[]
  /** Heading shown above the list (e.g. "Confirm meal", "Edit entry"). */
  onSearch: (q: string) => Promise<FoodSearchResult[]>
  onConfirm: (items: DraftFoodItem[], opts: { favorite: boolean }) => Promise<void> | void
  confirming?: boolean
  /** Confirm button label override. */
  confirmLabel?: string
}

function applyQuantity(item: DraftFoodItem, quantity: number, unit: string): DraftFoodItem {
  const macros = recomputeMacros({ ...item, unit }, quantity, unit)
  return { ...item, quantity, unit, ...macros }
}

/** Manual macro edit: store as per-serving (qty=1 baseline) so quantity still scales. */
function applyManualMacro(item: DraftFoodItem, field: keyof MacroSet, value: number): DraftFoodItem {
  const qty = item.quantity > 0 ? item.quantity : 1
  const perServing: MacroSet = { ...(item.perServing ?? emptyMacros()), [field]: value / qty }
  return { ...item, perServing, [field]: value }
}

const MACRO_FIELDS: { key: keyof MacroSet; label: string; suffix: string }[] = [
  { key: 'calories', label: 'Cal', suffix: '' },
  { key: 'protein_g', label: 'Protein', suffix: 'g' },
  { key: 'carb_g', label: 'Carbs', suffix: 'g' },
  { key: 'fat_g', label: 'Fat', suffix: 'g' },
]

export function DraftFoodEditor({ initialItems, onSearch, onConfirm, confirming, confirmLabel }: DraftFoodEditorProps) {
  const [items, setItems] = useState<DraftFoodItem[]>(initialItems)
  const [adding, setAdding] = useState(false)
  const [favorite, setFavorite] = useState(false)

  const lowConfidence = useMemo(
    () => items.some((i) => i.source === 'photo' && typeof i.confidence === 'number' && i.confidence < 0.6),
    [items]
  )

  const total = useMemo<MacroSet>(
    () => items.reduce((acc, i) => addMacros(acc, { calories: i.calories, protein_g: i.protein_g, carb_g: i.carb_g, fat_g: i.fat_g }), emptyMacros()),
    [items]
  )

  const updateItem = (tempId: string, next: DraftFoodItem) =>
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? next : i)))
  const removeItem = (tempId: string) => setItems((prev) => prev.filter((i) => i.tempId !== tempId))

  const handleAddSelected = (r: FoodSearchResult) => {
    setItems((prev) => [...prev, draftFromSearchResult(r)])
    setAdding(false)
  }

  if (adding) {
    return (
      <div>
        <button
          onClick={() => setAdding(false)}
          className="flex items-center gap-1 text-sm text-primary-light mb-3 hover:text-primary"
        >
          <ChevronLeft className="w-4 h-4" /> Back to items
        </button>
        <FoodSearchPanel onSearch={onSearch} onSelect={handleAddSelected} autoFocus placeholder="Add an ingredient…" />
      </div>
    )
  }

  return (
    <div>
      {lowConfidence && (
        <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-500/12 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Low recognition confidence — double-check the items and macros below before logging.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const isManual = item.editableMacros === true
            const units = item.per100g ? FOOD_UNITS : (['serving'] as const)
            return (
              <motion.div
                key={item.tempId}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-white/10 bg-white/4 p-3 overflow-hidden"
              >
                <div className="flex items-start gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(item.tempId, { ...item, name: e.target.value })}
                    placeholder="Food name"
                    className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-muted focus:outline-none border-b border-transparent focus:border-primary/40 pb-1"
                  />
                  <button
                    onClick={() => removeItem(item.tempId)}
                    aria-label="Remove item"
                    className="p-1.5 rounded-lg text-muted hover:text-coral hover:bg-coral/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity + unit */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center rounded-xl border border-white/12 bg-white/5">
                    <button
                      aria-label="Decrease"
                      onClick={() => updateItem(item.tempId, applyQuantity(item, Math.max(0, Math.round((item.quantity - step(item.unit)) * 100) / 100), item.unit))}
                      className="p-2 text-muted hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.tempId, applyQuantity(item, Math.max(0, Number(e.target.value) || 0), item.unit))}
                      className="w-12 text-center bg-transparent text-sm text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      aria-label="Increase"
                      onClick={() => updateItem(item.tempId, applyQuantity(item, Math.round((item.quantity + step(item.unit)) * 100) / 100, item.unit))}
                      className="p-2 text-muted hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(item.tempId, applyQuantity(item, item.quantity, e.target.value))}
                    className="rounded-xl border border-white/12 bg-white/5 text-sm text-white px-2.5 py-2 focus:outline-none focus:border-primary/40"
                  >
                    {units.map((u) => (
                      <option key={u} value={u} className="text-black">
                        {u}
                      </option>
                    ))}
                  </select>
                  {item.servingGrams && item.unit === 'serving' && (
                    <span className="text-[11px] text-muted">≈ {Math.round(item.servingGrams * item.quantity)} g</span>
                  )}
                </div>

                {/* Macros: read-only for OFF/photo, editable for blank manual */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {MACRO_FIELDS.map((f) => (
                    <div key={f.key} className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-muted">{f.label}</p>
                      {isManual ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          value={item[f.key] || ''}
                          onChange={(e) => updateItem(item.tempId, applyManualMacro(item, f.key, Math.max(0, Number(e.target.value) || 0)))}
                          className="w-full text-center bg-transparent text-sm font-semibold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-white tabular-nums">
                          {f.key === 'calories' ? Math.round(item[f.key]) : item[f.key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Add ingredient */}
      <button
        onClick={() => setAdding(true)}
        className="w-full flex items-center justify-center gap-1.5 mt-3 py-2.5 rounded-xl border border-dashed border-primary/30 text-sm text-primary-light hover:bg-primary/8 transition-colors"
      >
        <Plus className="w-4 h-4" /> Add ingredient
      </button>

      {/* Save to favorites */}
      <button
        onClick={() => setFavorite((v) => !v)}
        className="flex items-center gap-2 mt-4 text-sm text-muted hover:text-white transition-colors"
      >
        <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${favorite ? 'bg-primary border-primary' : 'border-white/25'}`}>
          {favorite && <Check className="w-3.5 h-3.5 text-accent-ink" />}
        </span>
        <Star className={`w-4 h-4 ${favorite ? 'text-gold' : ''}`} />
        Save to favorites for quick logging
      </button>

      {/* Footer total + confirm */}
      <div className="sticky bottom-0 mt-4 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent">
        <div className="flex items-center justify-between mb-2 text-xs text-muted">
          <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <span className="font-semibold text-white">
            {total.calories} kcal · {total.protein_g}P / {total.carb_g}C / {total.fat_g}F
          </span>
        </div>
        <button
          disabled={confirming || items.length === 0 || items.some((i) => !i.name.trim())}
          onClick={() => onConfirm(items, { favorite })}
          className="w-full py-3 rounded-xl text-sm font-semibold text-accent-ink bg-gradient-to-r from-primary to-primary-light shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          {confirming ? 'Saving…' : confirmLabel || `Log ${items.length || ''} item${items.length !== 1 ? 's' : ''}`.trim()}
        </button>
      </div>
    </div>
  )
}

function step(unit: string): number {
  return unit === 'g' || unit === 'ml' ? 10 : 1
}
