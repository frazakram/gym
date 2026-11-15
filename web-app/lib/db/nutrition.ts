// Nutrition goals, food entries and favorites.
import { NutritionGoals, FoodEntry, FavoriteFood, FoodSource, MacroSet } from '@/types';
import { revalidateTag } from 'next/cache';
import { pool } from './core';

// ============= NUTRITION TRACKING (FREE) =============

const VALID_FOOD_SOURCES: FoodSource[] = ['photo', 'barcode', 'search', 'manual'];

function coerceSource(s: unknown): FoodSource {
  return VALID_FOOD_SOURCES.includes(s as FoodSource) ? (s as FoodSource) : 'manual';
}

/** Postgres returns DECIMAL columns as strings — coerce a food row to numbers. */
function rowToFoodEntry(r: Record<string, unknown>): FoodEntry {
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    entry_date: String(r.entry_date),
    source: coerceSource(r.source),
    name: String(r.name),
    calories: Number(r.calories) || 0,
    protein_g: Number(r.protein_g) || 0,
    carb_g: Number(r.carb_g) || 0,
    fat_g: Number(r.fat_g) || 0,
    quantity: Number(r.quantity) || 0,
    unit: String(r.unit ?? 'serving'),
    created_at: String(r.created_at),
  };
}

function rowToFavorite(r: Record<string, unknown>): FavoriteFood {
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    name: String(r.name),
    source: coerceSource(r.source),
    calories: Number(r.calories) || 0,
    protein_g: Number(r.protein_g) || 0,
    carb_g: Number(r.carb_g) || 0,
    fat_g: Number(r.fat_g) || 0,
    quantity: Number(r.quantity) || 0,
    unit: String(r.unit ?? 'serving'),
    created_at: String(r.created_at),
  };
}

export interface FoodEntryInput {
  entry_date: string;
  source: FoodSource;
  name: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  quantity: number;
  unit: string;
}

export async function getNutritionGoals(userId: number): Promise<NutritionGoals> {
  const empty: NutritionGoals = {
    daily_calorie_goal: null,
    protein_goal_g: null,
    carb_goal_g: null,
    fat_goal_g: null,
    goal_type: null,
  };
  try {
    const res = await pool.query(
      `SELECT daily_calorie_goal, protein_goal_g, carb_goal_g, fat_goal_g, goal_type
       FROM profiles WHERE user_id = $1`,
      [userId]
    );
    const r = res.rows[0];
    if (!r) return empty;
    return {
      daily_calorie_goal: r.daily_calorie_goal != null ? Number(r.daily_calorie_goal) : null,
      protein_goal_g: r.protein_goal_g != null ? Number(r.protein_goal_g) : null,
      carb_goal_g: r.carb_goal_g != null ? Number(r.carb_goal_g) : null,
      fat_goal_g: r.fat_goal_g != null ? Number(r.fat_goal_g) : null,
      goal_type: (r.goal_type as NutritionGoals['goal_type']) ?? null,
    };
  } catch (error) {
    console.error('getNutritionGoals failed:', error);
    return empty;
  }
}

/**
 * Persist daily targets onto the profile. Writes only to the goal columns so it
 * never collides with the positional-arg saveProfile(). Requires an existing
 * profile row (created during onboarding).
 */
export async function saveNutritionGoals(userId: number, goals: NutritionGoals): Promise<NutritionGoals | null> {
  try {
    const res = await pool.query(
      `UPDATE profiles
          SET daily_calorie_goal = $2,
              protein_goal_g = $3,
              carb_goal_g = $4,
              fat_goal_g = $5,
              goal_type = $6,
              updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING daily_calorie_goal, protein_goal_g, carb_goal_g, fat_goal_g, goal_type`,
      [
        userId,
        goals.daily_calorie_goal,
        goals.protein_goal_g,
        goals.carb_goal_g,
        goals.fat_goal_g,
        goals.goal_type,
      ]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      daily_calorie_goal: r.daily_calorie_goal != null ? Number(r.daily_calorie_goal) : null,
      protein_goal_g: r.protein_goal_g != null ? Number(r.protein_goal_g) : null,
      carb_goal_g: r.carb_goal_g != null ? Number(r.carb_goal_g) : null,
      fat_goal_g: r.fat_goal_g != null ? Number(r.fat_goal_g) : null,
      goal_type: (r.goal_type as NutritionGoals['goal_type']) ?? null,
    };
  } catch (error) {
    console.error('saveNutritionGoals failed:', error);
    return null;
  }
}

/** Remember the user's activity level on their profile (so the goal wizard
 *  never has to ask twice). Best-effort. */
export async function saveActivityLevel(userId: number, level: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE profiles SET activity_level = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId, level]
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    revalidateTag('user-profile', undefined as any);
  } catch (error) {
    console.error('saveActivityLevel failed:', error);
  }
}

export async function getFoodEntries(userId: number, date: string): Promise<FoodEntry[]> {
  try {
    const res = await pool.query(
      `SELECT id, user_id, entry_date::text, source, name, calories, protein_g, carb_g, fat_g, quantity, unit, created_at
         FROM food_entries
        WHERE user_id = $1 AND entry_date = $2
        ORDER BY created_at ASC`,
      [userId, date]
    );
    return res.rows.map(rowToFoodEntry);
  } catch (error) {
    console.error('getFoodEntries failed:', error);
    return [];
  }
}

/** Inclusive date range, newest first — backs the historical/calendar view. */
export async function getFoodEntriesRange(userId: number, from: string, to: string): Promise<FoodEntry[]> {
  try {
    const res = await pool.query(
      `SELECT id, user_id, entry_date::text, source, name, calories, protein_g, carb_g, fat_g, quantity, unit, created_at
         FROM food_entries
        WHERE user_id = $1 AND entry_date BETWEEN $2 AND $3
        ORDER BY entry_date DESC, created_at ASC`,
      [userId, from, to]
    );
    return res.rows.map(rowToFoodEntry);
  } catch (error) {
    console.error('getFoodEntriesRange failed:', error);
    return [];
  }
}

export async function getDailyTotals(userId: number, date: string): Promise<MacroSet> {
  try {
    const res = await pool.query(
      `SELECT COALESCE(SUM(calories),0) AS calories,
              COALESCE(SUM(protein_g),0) AS protein_g,
              COALESCE(SUM(carb_g),0) AS carb_g,
              COALESCE(SUM(fat_g),0) AS fat_g
         FROM food_entries
        WHERE user_id = $1 AND entry_date = $2`,
      [userId, date]
    );
    const r = res.rows[0] ?? {};
    return {
      calories: Math.round(Number(r.calories) || 0),
      protein_g: Math.round(Number(r.protein_g) || 0),
      carb_g: Math.round(Number(r.carb_g) || 0),
      fat_g: Math.round(Number(r.fat_g) || 0),
    };
  } catch (error) {
    console.error('getDailyTotals failed:', error);
    return { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 };
  }
}

export async function addFoodEntry(userId: number, data: FoodEntryInput): Promise<FoodEntry | null> {
  try {
    const res = await pool.query(
      `INSERT INTO food_entries (user_id, entry_date, source, name, calories, protein_g, carb_g, fat_g, quantity, unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, user_id, entry_date::text, source, name, calories, protein_g, carb_g, fat_g, quantity, unit, created_at`,
      [
        userId,
        data.entry_date,
        coerceSource(data.source),
        data.name,
        data.calories,
        data.protein_g,
        data.carb_g,
        data.fat_g,
        data.quantity,
        data.unit,
      ]
    );
    return res.rows[0] ? rowToFoodEntry(res.rows[0]) : null;
  } catch (error) {
    console.error('addFoodEntry failed:', error);
    return null;
  }
}

export async function updateFoodEntry(
  userId: number,
  id: number,
  data: Partial<Omit<FoodEntryInput, 'entry_date' | 'source'>>
): Promise<FoodEntry | null> {
  try {
    const res = await pool.query(
      `UPDATE food_entries
          SET name = COALESCE($3, name),
              calories = COALESCE($4, calories),
              protein_g = COALESCE($5, protein_g),
              carb_g = COALESCE($6, carb_g),
              fat_g = COALESCE($7, fat_g),
              quantity = COALESCE($8, quantity),
              unit = COALESCE($9, unit)
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, entry_date::text, source, name, calories, protein_g, carb_g, fat_g, quantity, unit, created_at`,
      [
        id,
        userId,
        data.name ?? null,
        data.calories ?? null,
        data.protein_g ?? null,
        data.carb_g ?? null,
        data.fat_g ?? null,
        data.quantity ?? null,
        data.unit ?? null,
      ]
    );
    return res.rows[0] ? rowToFoodEntry(res.rows[0]) : null;
  } catch (error) {
    console.error('updateFoodEntry failed:', error);
    return null;
  }
}

export async function deleteFoodEntry(userId: number, id: number): Promise<boolean> {
  try {
    const res = await pool.query(`DELETE FROM food_entries WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('deleteFoodEntry failed:', error);
    return false;
  }
}

/** Most recently logged distinct foods, shaped like favorites for quick re-logging. */
export async function getRecentFoods(userId: number, limit = 10): Promise<FavoriteFood[]> {
  try {
    const lim = Math.max(1, Math.min(50, Math.floor(limit)));
    const res = await pool.query(
      `SELECT DISTINCT ON (lower(name), unit)
              id, user_id, name, source, calories, protein_g, carb_g, fat_g, quantity, unit, created_at
         FROM food_entries
        WHERE user_id = $1
        ORDER BY lower(name), unit, created_at DESC
        LIMIT $2`,
      [userId, lim]
    );
    return res.rows
      .map(rowToFavorite)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  } catch (error) {
    console.error('getRecentFoods failed:', error);
    return [];
  }
}

export async function getFavoriteFoods(userId: number): Promise<FavoriteFood[]> {
  try {
    const res = await pool.query(
      `SELECT id, user_id, name, source, calories, protein_g, carb_g, fat_g, quantity, unit, created_at
         FROM favorite_foods
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(rowToFavorite);
  } catch (error) {
    console.error('getFavoriteFoods failed:', error);
    return [];
  }
}

export async function addFavoriteFood(
  userId: number,
  data: Omit<FoodEntryInput, 'entry_date'>
): Promise<FavoriteFood | null> {
  try {
    const res = await pool.query(
      `INSERT INTO favorite_foods (user_id, name, source, calories, protein_g, carb_g, fat_g, quantity, unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, name, quantity, unit) DO UPDATE
         SET calories = EXCLUDED.calories,
             protein_g = EXCLUDED.protein_g,
             carb_g = EXCLUDED.carb_g,
             fat_g = EXCLUDED.fat_g,
             source = EXCLUDED.source
       RETURNING id, user_id, name, source, calories, protein_g, carb_g, fat_g, quantity, unit, created_at`,
      [
        userId,
        data.name,
        coerceSource(data.source),
        data.calories,
        data.protein_g,
        data.carb_g,
        data.fat_g,
        data.quantity,
        data.unit,
      ]
    );
    return res.rows[0] ? rowToFavorite(res.rows[0]) : null;
  } catch (error) {
    console.error('addFavoriteFood failed:', error);
    return null;
  }
}

export async function deleteFavoriteFood(userId: number, id: number): Promise<boolean> {
  try {
    const res = await pool.query(`DELETE FROM favorite_foods WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('deleteFavoriteFood failed:', error);
    return false;
  }
}
