/**
 * TDEE + macro-target math for goal setting.
 *
 * BMR uses the Mifflin-St Jeor equation (the modern standard, more accurate
 * than Harris-Benedict for most adults). TDEE = BMR × activity multiplier.
 * Goal targets apply a modest calorie offset and a protein-forward macro split.
 */

import type { ActivityLevel, GoalType, MacroSet } from '@/types';

export interface TdeeInput {
  age: number;
  weight_kg: number;
  height_cm: number;
  sex: 'Male' | 'Female';
  activity_level: ActivityLevel;
}

/** Standard Mifflin-St Jeor activity multipliers. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // little/no exercise
  light: 1.375, // 1–3 days/week
  moderate: 1.55, // 3–5 days/week
  active: 1.725, // 6–7 days/week
  very_active: 1.9, // hard exercise + physical job
};

/** Calorie offset from maintenance for each goal (kcal/day). */
export const GOAL_CALORIE_OFFSET: Record<GoalType, number> = {
  maintenance: 0,
  deficit: -400, // slight deficit for recomposition / fat loss
  surplus: 250, // slight surplus for lean gaining
};

export interface TdeeResult {
  bmr: number;
  tdee: number;
}

/** Mifflin-St Jeor BMR + activity-adjusted maintenance calories. */
export function calculateTdee(input: TdeeInput): TdeeResult {
  const { age, weight_kg, height_cm, sex, activity_level } = input;
  // Mifflin-St Jeor: (10·kg) + (6.25·cm) − (5·age) + s,  s = +5 (male) / −161 (female)
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  const bmr = sex === 'Male' ? base + 5 : base - 161;
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activity_level] ?? 1.2);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

/**
 * Compute daily macro targets from TDEE + goal. Protein-forward by default:
 * 2.0 g/kg bodyweight protein, 25% of calories from fat, remainder to carbs.
 */
export function goalTargets(tdee: number, goalType: GoalType, weight_kg: number): MacroSet {
  const calories = Math.max(1000, Math.round(tdee + (GOAL_CALORIE_OFFSET[goalType] ?? 0)));

  // Protein: 2.0 g per kg bodyweight (protein-forward), capped so it never
  // exceeds the calorie budget on very light/low-calorie targets.
  const proteinByWeight = Math.round(weight_kg * 2.0);
  const maxProteinByCalories = Math.floor((calories * 0.5) / 4); // never >50% kcal
  const protein_g = Math.min(proteinByWeight, maxProteinByCalories);

  // Fat: 25% of total calories (9 kcal/g).
  const fat_g = Math.round((calories * 0.25) / 9);

  // Carbs: whatever calories remain (4 kcal/g), floored at 0.
  const remaining = calories - protein_g * 4 - fat_g * 9;
  const carb_g = Math.max(0, Math.round(remaining / 4));

  return { calories, protein_g, carb_g, fat_g };
}
