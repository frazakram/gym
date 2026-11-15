// Experience points.
import { getStreak } from './analytics';
import { MOCK_USER_ID, allowMockAuth, pool } from './core';

// ============= XP SYSTEM =============

export const XP_VALUES = {
  EXERCISE: 50,
  DAY_COMPLETE: 500,
  STREAK_DAY: 100,
  STREAK_7: 1000,
  STREAK_30: 5000,
  STREAK_100: 25000,
} as const;

export type UserXp = {
  total_xp: number;
  last_streak_date: string | null;
  last_streak_value: number;
};

async function ensureUserXp(userId: number): Promise<void> {
  await pool.query(
    `INSERT INTO user_xp (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

export async function getUserXp(userId: number): Promise<UserXp> {
  if (allowMockAuth() && userId === MOCK_USER_ID) {
    return { total_xp: 0, last_streak_date: null, last_streak_value: 0 };
  }
  try {
    const res = await pool.query<{ total_xp: string; last_streak_date: Date | string | null; last_streak_value: number }>(
      `SELECT total_xp, last_streak_date, last_streak_value FROM user_xp WHERE user_id = $1`,
      [userId]
    );
    if (res.rows.length === 0) return { total_xp: 0, last_streak_date: null, last_streak_value: 0 };
    const row = res.rows[0];
    return {
      total_xp: Number(row.total_xp || 0),
      last_streak_date: row.last_streak_date ? String(row.last_streak_date).slice(0, 10) : null,
      last_streak_value: Number(row.last_streak_value || 0),
    };
  } catch (error) {
    console.error("getUserXp failed:", error);
    return { total_xp: 0, last_streak_date: null, last_streak_value: 0 };
  }
}

export async function awardXp(userId: number, eventType: string, points: number): Promise<void> {
  if (!Number.isFinite(points) || points <= 0) return;
  if (allowMockAuth() && userId === MOCK_USER_ID) return;
  try {
    await ensureUserXp(userId);
    await pool.query(
      `UPDATE user_xp SET total_xp = total_xp + $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId, points]
    );
    await pool.query(
      `INSERT INTO xp_events (user_id, event_type, points) VALUES ($1, $2, $3)`,
      [userId, eventType, points]
    );
  } catch (error) {
    console.error(`awardXp failed (user=${userId}, event=${eventType}):`, error);
  }
}

export async function awardStreakXpIfFirstToday(userId: number): Promise<void> {
  if (allowMockAuth() && userId === MOCK_USER_ID) return;
  try {
    await ensureUserXp(userId);
    const today = new Date().toISOString().slice(0, 10);
    const xp = await getUserXp(userId);
    if (xp.last_streak_date === today) return;

    const streak = await getStreak(userId);
    const current = streak.current;
    if (current <= 0) return;

    await awardXp(userId, 'streak_day', XP_VALUES.STREAK_DAY);

    const prev = xp.last_streak_value;
    if (prev < 7 && current >= 7) await awardXp(userId, 'streak_milestone_7', XP_VALUES.STREAK_7);
    if (prev < 30 && current >= 30) await awardXp(userId, 'streak_milestone_30', XP_VALUES.STREAK_30);
    if (prev < 100 && current >= 100) await awardXp(userId, 'streak_milestone_100', XP_VALUES.STREAK_100);

    await pool.query(
      `UPDATE user_xp SET last_streak_date = $2, last_streak_value = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId, today, current]
    );
  } catch (error) {
    console.error("awardStreakXpIfFirstToday failed:", error);
  }
}
