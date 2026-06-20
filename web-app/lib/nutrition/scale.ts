/**
 * Pure, client-safe macro-scaling helpers shared by the draft food editor and
 * the entry flows (search / barcode / photo / manual). No network, no env — so
 * it's safe to import into client components.
 */

import type { DraftFoodItem, FoodEntry, FoodSearchResult, MacroSet } from '@/types';

/** Units the editor offers. 'serving' uses declared serving grams when known. */
export const FOOD_UNITS = ['serving', 'g', 'ml'] as const;
export type FoodUnit = (typeof FOOD_UNITS)[number];

const round1 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;

/** Multiply a macro set by a factor, rounding for display. */
export function scaleMacroSet(m: MacroSet, factor: number): MacroSet {
  return {
    calories: Math.round(m.calories * factor),
    protein_g: round1(m.protein_g * factor),
    carb_g: round1(m.carb_g * factor),
    fat_g: round1(m.fat_g * factor),
  };
}

export function emptyMacros(): MacroSet {
  return { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 };
}

export function addMacros(a: MacroSet, b: MacroSet): MacroSet {
  return {
    calories: a.calories + b.calories,
    protein_g: round1(a.protein_g + b.protein_g),
    carb_g: round1(a.carb_g + b.carb_g),
    fat_g: round1(a.fat_g + b.fat_g),
  };
}

/**
 * Recompute an item's macros for a chosen quantity + unit, using whichever base
 * the item carries. Manual items with no base keep their current macros.
 */
export function recomputeMacros(item: DraftFoodItem, quantity: number, unit: string): MacroSet {
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

  if (item.per100g) {
    const grams = unit === 'g' || unit === 'ml' ? qty : (item.servingGrams ?? 100) * qty;
    return scaleMacroSet(item.per100g, grams / 100);
  }
  if (item.perServing) {
    // perServing is defined for the 'serving' unit; scale linearly by quantity.
    return scaleMacroSet(item.perServing, qty);
  }
  return { calories: item.calories, protein_g: item.protein_g, carb_g: item.carb_g, fat_g: item.fat_g };
}

let tempCounter = 0;
function tempId(prefix: string): string {
  tempCounter += 1;
  return `${prefix}-${Date.now()}-${tempCounter}`;
}

/** Build an editable draft item from an Open Food Facts search/barcode result. */
export function draftFromSearchResult(r: FoodSearchResult): DraftFoodItem {
  // Default to one declared serving when known, else 100 g.
  const useServing = typeof r.serving_grams === 'number' && r.serving_grams > 0;
  const quantity = 1;
  const unit: FoodUnit = useServing ? 'serving' : 'g';
  const baseQty = useServing ? 1 : 100;
  const macros = recomputeMacros(
    { ...emptyMacros(), tempId: '', name: r.name, quantity: baseQty, unit, source: r.source, per100g: r.per100g, servingGrams: r.serving_grams },
    baseQty,
    unit
  );
  return {
    tempId: tempId(r.source),
    name: r.brand ? `${r.name} (${r.brand})` : r.name,
    quantity,
    unit,
    source: r.source,
    per100g: r.per100g,
    servingGrams: r.serving_grams,
    ...macros,
  };
}

/** A blank manual draft item for the "quick add" / "add ingredient" flow. */
export function blankDraft(name = ''): DraftFoodItem {
  return {
    tempId: tempId('manual'),
    name,
    quantity: 1,
    unit: 'serving',
    source: 'manual',
    perServing: emptyMacros(),
    editableMacros: true,
    ...emptyMacros(),
  };
}

/** Build an editable draft from an already-logged entry (for in-place editing). */
export function draftFromEntry(entry: FoodEntry): DraftFoodItem {
  const qty = entry.quantity > 0 ? entry.quantity : 1;
  const current: MacroSet = {
    calories: entry.calories,
    protein_g: entry.protein_g,
    carb_g: entry.carb_g,
    fat_g: entry.fat_g,
  };
  return {
    tempId: `entry-${entry.id}`,
    name: entry.name,
    quantity: entry.quantity,
    unit: entry.unit,
    source: entry.source,
    // Keep a per-serving base so quantity still rescales, but allow direct edits
    // since we no longer have the original per-100g data.
    perServing: scaleMacroSet(current, 1 / qty),
    editableMacros: true,
    ...current,
  };
}
