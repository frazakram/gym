// AI diet plan persistence.
import { allowMockAuth, pool } from './core';

const mockDietStore = new Map<number, any>();

// ============= DIET PERSISTENCE =============

export async function saveDiet(
  userId: number,
  weekNumber: number,
  diet: any
): Promise<number | null> {
  try {
    const result = await pool.query(
      `INSERT INTO diets (user_id, week_number, diet_json)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, weekNumber, JSON.stringify(diet)]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("saveDiet DB failed, using mock:", error);
      const mockId = Math.floor(Math.random() * 100000) + 100000;
      mockDietStore.set(mockId, {
        id: mockId,
        user_id: userId,
        week_number: weekNumber,
        diet_json: diet,
        created_at: new Date()
      });
      return mockId;
    }
    console.error("saveDiet DB failed:", error);
    throw error;
  }
}

export async function getLatestDiet(userId: number): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, week_number, diet_json, created_at
       FROM diets
       WHERE user_id = $1
       ORDER BY week_number DESC, created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length > 0) return result.rows[0];
    return null;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getLatestDiet DB failed, checking mock:", error);
      const userDiets = Array.from(mockDietStore.values())
        .filter(r => r.user_id === userId)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return userDiets[0] || null;
    }
    console.error("getLatestDiet DB failed:", error);
    return null;
  }
}

export async function getDietByWeek(userId: number, weekNumber: number): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, week_number, diet_json, created_at
       FROM diets
       WHERE user_id = $1 AND week_number = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, weekNumber]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getDietByWeek DB failed, checking mock:", error);
      return Array.from(mockDietStore.values())
        .find(r => r.user_id === userId && r.week_number === weekNumber) || null;
    }
    console.error("getDietByWeek DB failed:", error);
    throw error;
  }
}
