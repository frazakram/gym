// Analytics, streaks and the activity heatmap.
import { MOCK_USER_ID, allowMockAuth, pool } from './core';
import { mockCompletionStore } from './routines';

// ============= ANALYTICS (PREMIUM) =============

type AnalyticsPayload = {
  range_days: number;
  generated_at: string;
  trends: {
    daily: Array<{ date: string; completion_percentage: number; workouts: number }>;
    weekly: Array<{ week: string; completion_percentage: number; workouts: number }>;
    monthly: Array<{ month: string; completion_percentage: number; workouts: number }>;
  };
  streak: { current: number; longest: number; last_workout_date: string | null };
  calendar: Array<{ date: string; workouts: number; completion_percentage: number | null }>;
  workout_history: Array<{
    workout_at: string;
    date: string;
    routine_id: number;
    week_number: number | null;
    day_index: number;
    day_name: string;
    completed_exercises: number;
    total_exercises: number;
    completion_percentage: number;
  }>;
};

function toYmdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function isoWeekKey(date: Date): string {
  // ISO week date weeks start on Monday
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // (Sunday is 0, Monday is 1, ...)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const yyyy = d.getUTCFullYear();
  const ww = String(weekNo).padStart(2, "0");
  return `${yyyy}-W${ww}`;
}

function computeStreak(sortedUniqueDatesDesc: string[]): { current: number; longest: number; last_workout_date: string | null } {
  if (sortedUniqueDatesDesc.length === 0) return { current: 0, longest: 0, last_workout_date: null };

  // Convert to UTC midnight timestamps
  const toUtcMid = (ymd: string) => Date.parse(`${ymd}T00:00:00.000Z`);
  const dates = sortedUniqueDatesDesc
    .map((d) => ({ d, t: toUtcMid(d) }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => b.t - a.t);

  const last = dates[0]?.d ?? null;
  if (!last) return { current: 0, longest: 0, last_workout_date: null };

  // Current streak: start from today or yesterday depending on activity
  const today = toYmdUTC(new Date());
  const todayT = toUtcMid(today);
  const set = new Set(dates.map((x) => x.d));

  let current = 0;
  for (let i = 0; i < 366; i++) {
    const dayT = todayT - i * 86400000;
    const ymd = toYmdUTC(new Date(dayT));
    if (set.has(ymd)) {
      current++;
    } else {
      // If no workout today, allow streak to start from yesterday
      if (i === 0) continue;
      break;
    }
  }

  // Longest streak: scan all unique dates
  const asc = [...dates].sort((a, b) => a.t - b.t);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < asc.length; i++) {
    const diffDays = Math.round((asc[i].t - asc[i - 1].t) / 86400000);
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  return { current, longest: longest || 0, last_workout_date: last };
}

export async function getUserAnalytics(
  userId: number,
  opts?: { rangeDays?: number }
): Promise<AnalyticsPayload> {
  const rangeDays = Math.max(7, Math.min(365, Number(opts?.rangeDays ?? 90) || 90));
  const now = new Date();
  const since = new Date(now.getTime() - rangeDays * 86400000);

  // In mock mode we have no timestamps; show something useful without crashing.
  if (allowMockAuth() && userId === MOCK_USER_ID) {
    const today = toYmdUTC(now);
    const workout_history: AnalyticsPayload["workout_history"] = [];
    for (const [routineId, store] of mockCompletionStore.entries()) {
      const completed = Array.from(store.values()).filter(Boolean).length;
      const total = Math.max(completed, 1);
      workout_history.push({
        workout_at: now.toISOString(),
        date: today,
        routine_id: routineId,
        week_number: null,
        day_index: 0,
        day_name: "Workout",
        completed_exercises: completed,
        total_exercises: total,
        completion_percentage: clampPct((completed / total) * 100),
      });
    }
    const daily = [{ date: today, completion_percentage: workout_history[0]?.completion_percentage ?? 0, workouts: workout_history.length }];
    const weekly = [{ week: isoWeekKey(now), completion_percentage: daily[0].completion_percentage, workouts: daily[0].workouts }];
    const monthly = [{ month: today.slice(0, 7), completion_percentage: daily[0].completion_percentage, workouts: daily[0].workouts }];
    const streak = computeStreak(workout_history.length ? [today] : []);
    const calendar = Array.from({ length: rangeDays }, (_, i) => {
      const d = new Date(now.getTime() - (rangeDays - 1 - i) * 86400000);
      const ymd = toYmdUTC(d);
      const has = ymd === today && workout_history.length > 0;
      return { date: ymd, workouts: has ? workout_history.length : 0, completion_percentage: has ? daily[0].completion_percentage : null };
    });
    return {
      range_days: rangeDays,
      generated_at: now.toISOString(),
      trends: { daily, weekly, monthly },
      streak,
      calendar,
      workout_history: workout_history.slice(0, 10),
    };
  }

  try {
    // Step 1: Identify workout "sessions" (routine_id + day_index) that had any completion in the window.
    const sessionsRes = await pool.query<{
      routine_id: number;
      day_index: number;
      workout_at: Date | string;
    }>(
      `
      SELECT ec.routine_id, ec.day_index, MAX(ec.completed_at) AS workout_at
      FROM exercise_completions ec
      JOIN routines r ON r.id = ec.routine_id
      WHERE r.user_id = $1
        AND ec.completed = TRUE
        AND ec.completed_at IS NOT NULL
        AND ec.completed_at >= $2
      GROUP BY ec.routine_id, ec.day_index
      ORDER BY workout_at DESC
      `,
      [userId, since]
    );

    const restRes = await pool.query<{
      routine_id: number;
      day_index: number;
      workout_at: Date | string;
    }>(
      `
      SELECT dc.routine_id, dc.day_index, MAX(dc.completed_at) AS workout_at
      FROM day_completions dc
      JOIN routines r ON r.id = dc.routine_id
      WHERE r.user_id = $1
        AND dc.completed = TRUE
        AND dc.completed_at IS NOT NULL
        AND dc.completed_at >= $2
      GROUP BY dc.routine_id, dc.day_index
      ORDER BY workout_at DESC
      `,
      [userId, since]
    );

    const sessions = sessionsRes.rows
      .map((s) => ({
        routine_id: Number(s.routine_id),
        day_index: Number(s.day_index),
        workout_at: s.workout_at instanceof Date ? s.workout_at : new Date(String(s.workout_at)),
      }))
      .filter((s) => Number.isFinite(s.routine_id) && Number.isFinite(s.day_index) && !Number.isNaN(s.workout_at.getTime()));

    const restSessions = restRes.rows
      .map((s) => ({
        routine_id: Number(s.routine_id),
        day_index: Number(s.day_index),
        workout_at: s.workout_at instanceof Date ? s.workout_at : new Date(String(s.workout_at)),
      }))
      .filter((s) => Number.isFinite(s.routine_id) && Number.isFinite(s.day_index) && !Number.isNaN(s.workout_at.getTime()));

    const allSessions = sessions.concat(restSessions);

    const routineIds = Array.from(new Set(allSessions.map((s) => s.routine_id)));
    if (routineIds.length === 0) {
      const calendar = Array.from({ length: rangeDays }, (_, i) => {
        const d = new Date(now.getTime() - (rangeDays - 1 - i) * 86400000);
        return { date: toYmdUTC(d), workouts: 0, completion_percentage: null };
      });
      return {
        range_days: rangeDays,
        generated_at: now.toISOString(),
        trends: { daily: [], weekly: [], monthly: [] },
        streak: { current: 0, longest: 0, last_workout_date: null },
        calendar,
        workout_history: [],
      };
    }

    // Step 2: Fetch routines (for totals/day names).
    const routinesRes = await pool.query<{
      id: number;
      week_number: number;
      routine_json: any;
      created_at: Date | string;
    }>(
      `SELECT id, week_number, routine_json, created_at
       FROM routines
       WHERE user_id = $1 AND id = ANY($2::int[])`,
      [userId, routineIds]
    );

    const routineById = new Map<number, { week_number: number | null; routine_json: any }>();
    for (const r of routinesRes.rows) {
      const id = Number(r.id);
      const week_number = r.week_number != null ? Number(r.week_number) : null;
      const raw = (r as any).routine_json;
      let routine_json: any = raw;
      if (typeof raw === "string") {
        try {
          routine_json = JSON.parse(raw);
        } catch {
          routine_json = null;
        }
      }
      routineById.set(id, { week_number, routine_json });
    }

    // Step 3: Completed counts per routine/day (current state)
    const countsRes = await pool.query<{
      routine_id: number;
      day_index: number;
      completed_count: string | number;
    }>(
      `
      SELECT routine_id, day_index, COUNT(*) FILTER (WHERE completed = TRUE) AS completed_count
      FROM exercise_completions
      WHERE routine_id = ANY($1::int[])
      GROUP BY routine_id, day_index
      `,
      [routineIds]
    );
    const completedCountByKey = new Map<string, number>();
    for (const row of countsRes.rows) {
      const key = `${Number(row.routine_id)}:${Number(row.day_index)}`;
      completedCountByKey.set(key, Number(row.completed_count) || 0);
    }

    // Step 4: Build workout_history sessions with totals from routine_json
    const workoutSessions: AnalyticsPayload["workout_history"] = allSessions
      .map((s) => {
        const routine = routineById.get(s.routine_id);
        const days = routine?.routine_json?.days;
        const dayObj = Array.isArray(days) ? days[s.day_index] : null;
        const exercises = dayObj?.exercises;
        const total = Array.isArray(exercises) ? exercises.length : 0;
        const key = `${s.routine_id}:${s.day_index}`;
        const completed = completedCountByKey.get(key) ?? 0;
        const isRestDay = total === 0;
        const unitTotal = isRestDay ? 1 : total;
        const unitCompleted = isRestDay ? 1 : Math.min(completed, unitTotal || completed);
        const pct = unitTotal > 0 ? (unitCompleted / unitTotal) * 100 : 0;
        return {
          workout_at: s.workout_at.toISOString(),
          date: toYmdUTC(s.workout_at),
          routine_id: s.routine_id,
          week_number: routine?.week_number ?? null,
          day_index: s.day_index,
          day_name: typeof dayObj?.day === "string" ? dayObj.day : isRestDay ? "Rest Day" : `Day ${s.day_index + 1}`,
          completed_exercises: unitCompleted,
          total_exercises: unitTotal,
          completion_percentage: clampPct(pct),
        };
      })
      .sort((a, b) => (a.workout_at < b.workout_at ? 1 : -1));

    // Trends + calendar are derived from workout sessions (weighted by total exercises)
    const dailyAgg = new Map<string, { completed: number; total: number; workouts: number }>();
    for (const w of workoutSessions) {
      const agg = dailyAgg.get(w.date) ?? { completed: 0, total: 0, workouts: 0 };
      agg.completed += w.completed_exercises;
      agg.total += w.total_exercises;
      agg.workouts += 1;
      dailyAgg.set(w.date, agg);
    }

    const calendar: AnalyticsPayload["calendar"] = Array.from({ length: rangeDays }, (_, i) => {
      const d = new Date(now.getTime() - (rangeDays - 1 - i) * 86400000);
      const ymd = toYmdUTC(d);
      const agg = dailyAgg.get(ymd);
      if (!agg) return { date: ymd, workouts: 0, completion_percentage: null };
      return {
        date: ymd,
        workouts: agg.workouts,
        completion_percentage: clampPct((agg.completed / Math.max(1, agg.total)) * 100),
      };
    });

    const daily: AnalyticsPayload["trends"]["daily"] = [...dailyAgg.entries()]
      .map(([date, agg]) => ({
        date,
        completion_percentage: clampPct((agg.completed / Math.max(1, agg.total)) * 100),
        workouts: agg.workouts,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const weeklyAgg = new Map<string, { completed: number; total: number; workouts: number }>();
    for (const d of daily) {
      const k = isoWeekKey(new Date(`${d.date}T00:00:00.000Z`));
      const agg = weeklyAgg.get(k) ?? { completed: 0, total: 0, workouts: 0 };
      // Reconstruct weights using completion% and workouts is not precise; instead use dailyAgg weights.
      const raw = dailyAgg.get(d.date)!;
      agg.completed += raw.completed;
      agg.total += raw.total;
      agg.workouts += raw.workouts;
      weeklyAgg.set(k, agg);
    }
    const weekly: AnalyticsPayload["trends"]["weekly"] = [...weeklyAgg.entries()]
      .map(([week, agg]) => ({
        week,
        completion_percentage: clampPct((agg.completed / Math.max(1, agg.total)) * 100),
        workouts: agg.workouts,
      }))
      .sort((a, b) => (a.week < b.week ? -1 : 1));

    const monthlyAgg = new Map<string, { completed: number; total: number; workouts: number }>();
    for (const w of workoutSessions) {
      const month = String(w.date).slice(0, 7); // YYYY-MM
      const agg = monthlyAgg.get(month) ?? { completed: 0, total: 0, workouts: 0 };
      agg.completed += w.completed_exercises;
      agg.total += w.total_exercises;
      agg.workouts += 1;
      monthlyAgg.set(month, agg);
    }
    const monthly: AnalyticsPayload["trends"]["monthly"] = [...monthlyAgg.entries()]
      .map(([month, agg]) => ({
        month,
        completion_percentage: clampPct((agg.completed / Math.max(1, agg.total)) * 100),
        workouts: agg.workouts,
      }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));

    const uniqueDatesDesc = [...new Set(workoutSessions.map((w) => w.date))].sort((a, b) => (a < b ? 1 : -1));
    const streak = computeStreak(uniqueDatesDesc);

    return {
      range_days: rangeDays,
      generated_at: now.toISOString(),
      trends: { daily, weekly, monthly },
      streak,
      calendar,
      workout_history: workoutSessions.slice(0, 10),
    };
  } catch (error) {
    console.error("getUserAnalytics DB failed:", error);
    const calendar = Array.from({ length: rangeDays }, (_, i) => {
      const d = new Date(now.getTime() - (rangeDays - 1 - i) * 86400000);
      return { date: toYmdUTC(d), workouts: 0, completion_percentage: null };
    });
    return {
      range_days: rangeDays,
      generated_at: now.toISOString(),
      trends: { daily: [], weekly: [], monthly: [] },
      streak: { current: 0, longest: 0, last_workout_date: null },
      calendar,
      workout_history: [],
    };
  }
}

export type StreakData = { current: number; longest: number; last_workout_date: string | null };

export async function getStreak(userId: number): Promise<StreakData> {
  if (allowMockAuth() && userId === MOCK_USER_ID) {
    return { current: 0, longest: 0, last_workout_date: null };
  }
  try {
    // use module-level pool
    // Fetch unique workout dates (last 366 days is enough for streak calc)
    const since = new Date(Date.now() - 366 * 86400000);
    const res = await pool.query<{ d: string }>(
      `SELECT DISTINCT DATE(completed_at AT TIME ZONE 'UTC') AS d
       FROM exercise_completions ec
       JOIN routines r ON r.id = ec.routine_id
       WHERE r.user_id = $1 AND ec.completed = TRUE AND ec.completed_at >= $2
       ORDER BY d DESC`,
      [userId, since]
    );
    const dates = res.rows.map((r) => String(r.d).slice(0, 10));
    return computeStreak(dates);
  } catch (error) {
    console.error("getStreak DB failed:", error);
    return { current: 0, longest: 0, last_workout_date: null };
  }
}

// ============= HEATMAP DATA (FREE) =============

export type HeatmapData = Array<{ date: string; value: number }>;

export async function getHeatmapData(
  userId: number,
  days: number = 56 // 8 weeks by default
): Promise<HeatmapData> {
  const now = new Date();
  const since = new Date(now.getTime() - days * 86400000);

  // In mock mode, return empty heatmap data
  if (allowMockAuth()) {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getTime() - (days - 1 - i) * 86400000);
      return { date: toYmdUTC(d), value: 0 };
    });
  }

  try {
    // Get all exercise completions with timestamps
    const exerciseRes = await pool.query<{
      routine_id: number;
      day_index: number;
      workout_at: Date | string;
      completed_count: number;
      total_count: number;
    }>(
      `
      SELECT 
        ec.routine_id, 
        ec.day_index, 
        DATE(ec.completed_at) as workout_at,
        COUNT(CASE WHEN ec.completed = TRUE THEN 1 END) as completed_count,
        COUNT(*) as total_count
      FROM exercise_completions ec
      JOIN routines r ON r.id = ec.routine_id
      WHERE r.user_id = $1
        AND ec.completed_at IS NOT NULL
        AND ec.completed_at >= $2
      GROUP BY ec.routine_id, ec.day_index, DATE(ec.completed_at)
      `,
      [userId, since]
    );

    // Also get rest day completions
    const restRes = await pool.query<{
      routine_id: number;
      day_index: number;
      workout_at: Date | string;
    }>(
      `
      SELECT 
        dc.routine_id, 
        dc.day_index, 
        DATE(dc.completed_at) as workout_at
      FROM day_completions dc
      JOIN routines r ON r.id = dc.routine_id
      WHERE r.user_id = $1
        AND dc.completed = TRUE
        AND dc.completed_at IS NOT NULL
        AND dc.completed_at >= $2
      `,
      [userId, since]
    );

    // Build a map of date -> completion percentage
    const dailyCompletion = new Map<string, { completed: number; total: number }>();

    // Process exercise completions
    for (const row of exerciseRes.rows) {
      const dateStr = row.workout_at instanceof Date 
        ? toYmdUTC(row.workout_at) 
        : String(row.workout_at).slice(0, 10);
      const agg = dailyCompletion.get(dateStr) ?? { completed: 0, total: 0 };
      agg.completed += Number(row.completed_count) || 0;
      agg.total += Number(row.total_count) || 0;
      dailyCompletion.set(dateStr, agg);
    }

    // Process rest day completions (count as 1/1 completed)
    for (const row of restRes.rows) {
      const dateStr = row.workout_at instanceof Date 
        ? toYmdUTC(row.workout_at) 
        : String(row.workout_at).slice(0, 10);
      const agg = dailyCompletion.get(dateStr) ?? { completed: 0, total: 0 };
      agg.completed += 1;
      agg.total += 1;
      dailyCompletion.set(dateStr, agg);
    }

    // Generate heatmap data for all days in range
    const heatmapData: HeatmapData = Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getTime() - (days - 1 - i) * 86400000);
      const dateStr = toYmdUTC(d);
      const agg = dailyCompletion.get(dateStr);
      
      if (!agg || agg.total === 0) {
        return { date: dateStr, value: 0 };
      }
      
      // Value is completion percentage normalized to 0-1
      const pct = agg.completed / agg.total;
      return { date: dateStr, value: Math.round(pct * 100) / 100 };
    });

    return heatmapData;
  } catch (error) {
    console.error("getHeatmapData DB failed:", error);
    // Return empty heatmap on error
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getTime() - (days - 1 - i) * 86400000);
      return { date: toYmdUTC(d), value: 0 };
    });
  }
}

/**
 * Completed exercises since a date, with their names from the routine they
 * belong to (for the Progress chart). One row per completed exercise.
 */
export async function getCompletedExercisesSince(
  userId: number,
  since: Date
): Promise<Array<{ date: string; name: string }>> {
  if (allowMockAuth()) return [];
  const res = await pool.query<{
    day_index: number;
    exercise_index: number;
    completed_on: string;
    routine_json: unknown;
  }>(
    `
    -- to_char, not DATE(): node-postgres turns a DATE into local midnight, which
    -- shifts the day when the server is not on UTC.
    SELECT ec.day_index, ec.exercise_index, to_char(ec.completed_at, 'YYYY-MM-DD') AS completed_on, r.routine_json
    FROM exercise_completions ec
    JOIN routines r ON r.id = ec.routine_id
    WHERE r.user_id = $1
      AND ec.completed = TRUE
      AND ec.completed_at IS NOT NULL
      AND ec.completed_at >= $2
    `,
    [userId, since]
  );
  const rows: Array<{ date: string; name: string }> = [];
  for (const row of res.rows) {
    let routine = row.routine_json as { days?: Array<{ exercises?: Array<{ name?: unknown }> }> } | string | null;
    if (typeof routine === "string") {
      try { routine = JSON.parse(routine); } catch { routine = null; }
    }
    const name = (routine as { days?: Array<{ exercises?: Array<{ name?: unknown }> }> } | null)?.days?.[row.day_index]?.exercises?.[row.exercise_index]?.name;
    rows.push({ date: row.completed_on, name: typeof name === "string" ? name : "" });
  }
  return rows;
}
