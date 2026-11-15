// Routines, exercise/day completions and personal records.
import { allowMockAuth, pool } from './core';

// ============= ROUTINE & PROGRESS TRACKING =============

// Mock Storage
const mockRoutineStore = new Map<number, any>();

// Key: routineId -> Array of execution records
export const mockCompletionStore = new Map<number, Map<string, boolean>>();

// Key: routineId -> Map<dayIndex, { completed: boolean; completed_at: Date | null }>
const mockDayCompletionStore = new Map<number, Map<number, { completed: boolean; completed_at: Date | null }>>();

export async function saveRoutine(
  userId: number,
  weekNumber: number,
  routine: any,
  weekStartDate?: Date | string | null,
  profileSnapshot?: any
): Promise<number | null> {
  try {
    const result = await pool.query(
      `INSERT INTO routines (user_id, week_number, routine_json, week_start_date, archived, profile_snapshot)
       VALUES ($1, $2, $3, $4, FALSE, $5)
       RETURNING id`,
      [userId, weekNumber, JSON.stringify(routine), weekStartDate ?? null, profileSnapshot ? JSON.stringify(profileSnapshot) : null]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("saveRoutine DB failed, using mock:", error);
      // FALLBACK
      const mockId = Math.floor(Math.random() * 100000) + 100000;
      mockRoutineStore.set(mockId, {
        id: mockId,
        user_id: userId,
        week_number: weekNumber,
        routine_json: routine,
        week_start_date: weekStartDate ?? null,
        profile_snapshot: profileSnapshot,
        created_at: new Date()
      });
      return mockId;
    }
    console.error("saveRoutine DB failed:", error);
    throw error;
  }
}

export async function getLatestRoutine(userId: number, asOfDate?: string): Promise<any | null> {
  // asOfDate (YYYY-MM-DD in the user's local timezone) gates out future routines.
  // Without it, a routine pre-generated for next week would be returned as "latest"
  // while the user is still in the current week — causing stale completions to leak
  // across week boundaries.
  try {
    const result = asOfDate
      ? await pool.query(
          `SELECT id, user_id, week_number, routine_json, week_start_date, created_at
           FROM routines
           WHERE user_id = $1
             AND archived = FALSE
             AND (week_start_date IS NULL OR week_start_date <= $2::date)
           ORDER BY week_start_date DESC NULLS LAST, week_number DESC, created_at DESC
           LIMIT 1`,
          [userId, asOfDate]
        )
      : await pool.query(
          `SELECT id, user_id, week_number, routine_json, week_start_date, created_at
           FROM routines
           WHERE user_id = $1
             AND archived = FALSE
           ORDER BY week_start_date DESC NULLS LAST, week_number DESC, created_at DESC
           LIMIT 1`,
          [userId]
        );
    if (result.rows.length > 0) return result.rows[0];
    throw new Error("No DB routine found");
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getLatestRoutine DB failed/empty, checking mock:", error);
      // FALLBACK
      const cutoff = asOfDate ? new Date(`${asOfDate}T23:59:59`) : null;
      const userRoutines = Array.from(mockRoutineStore.values())
        .filter(r => {
          if (r.user_id !== userId) return false;
          if (!cutoff || !r.week_start_date) return true;
          const ws = r.week_start_date instanceof Date ? r.week_start_date : new Date(r.week_start_date);
          return ws.getTime() <= cutoff.getTime();
        })
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return userRoutines[0] || null;
    }
    console.error("getLatestRoutine DB failed:", error);
    // If it's just a 404/not found, we might want to return null?
    // But the original code throws "No DB routine found" inside the try, which is caught here.
    // If it's a connection error, we want to throw.
    // If we throw here, the API returns 500.
    // If the user has no routine, we usually want to return null, not 500.
    // But the original query inside try block catches empty result and throws "No DB routine found".
    // So if I throw here, "No DB routine found" becomes a 500.
    // Ideally, "No DB routine found" should be handled as "return null" if it's just empty.
    // Let's refine this one:
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("No DB routine found")) {
      return null; // Not found is strictly not an error
    }
    throw error;
  }
}

export async function getRoutineById(userId: number, routineId: number): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, week_number, routine_json, week_start_date, archived, archived_at, profile_snapshot, created_at
       FROM routines
       WHERE id = $1 AND user_id = $2`,
      [routineId, userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (allowMockAuth()) {
      return mockRoutineStore.get(routineId) || null;
    }
    console.error("getRoutineById DB failed:", error);
    throw error;
  }
}

export async function getRoutinesByUser(
  userId: number,
  opts?: { includeArchived?: boolean; archivedOnly?: boolean }
): Promise<any[]> {
  try {
    const includeArchived = Boolean(opts?.includeArchived);
    const archivedOnly = Boolean(opts?.archivedOnly);
    const where =
      archivedOnly ? `archived = TRUE` : includeArchived ? `TRUE` : `archived = FALSE`;

    const result = await pool.query(
      `SELECT id, user_id, week_number, routine_json, week_start_date, archived, archived_at, created_at
       FROM routines
       WHERE user_id = $1
         AND ${where}
       ORDER BY archived ASC, week_number DESC, week_start_date DESC NULLS LAST, created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getRoutinesByUser DB failed, checking mock:", error);
      // FALLBACK
      return Array.from(mockRoutineStore.values())
        .filter(r => r.user_id === userId)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
    console.error("getRoutinesByUser DB failed:", error);
    throw error;
  }
}

export async function getRoutineByWeek(userId: number, weekNumber: number): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, week_number, routine_json, week_start_date, profile_snapshot, created_at
       FROM routines
       WHERE user_id = $1 AND week_number = $2
         AND archived = FALSE
       ORDER BY week_start_date DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [userId, weekNumber]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getRoutineByWeek DB failed, checking mock:", error);
      return Array.from(mockRoutineStore.values())
        .find(r => r.user_id === userId && r.week_number === weekNumber) || null;
    }
    console.error("getRoutineByWeek DB failed:", error);
    throw error;
  }
}

export async function setRoutineArchived(userId: number, routineId: number, archived: boolean): Promise<boolean> {
  try {
    const res = await pool.query(
      `UPDATE routines
       SET archived = $3,
           archived_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $1 AND user_id = $2`,
      [routineId, userId, archived]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    if (allowMockAuth()) {
      const r = mockRoutineStore.get(routineId);
      if (r && r.user_id === userId) {
        r.archived = archived;
        r.archived_at = archived ? new Date() : null;
        mockRoutineStore.set(routineId, r);
        return true;
      }
      return false;
    }
    console.error("setRoutineArchived DB failed:", error);
    throw error;
  }
}

export async function deleteRoutineById(userId: number, routineId: number): Promise<boolean> {
  try {
    const res = await pool.query(
      `DELETE FROM routines WHERE id = $1 AND user_id = $2`,
      [routineId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    if (allowMockAuth()) {
      const r = mockRoutineStore.get(routineId);
      if (r && r.user_id === userId) {
        mockRoutineStore.delete(routineId);
        mockCompletionStore.delete(routineId);
        mockDayCompletionStore.delete(routineId);
        return true;
      }
      return false;
    }
    console.error("deleteRoutineById DB failed:", error);
    throw error;
  }
}

/** Optional logged-set details persisted alongside an exercise completion. */
export interface ExerciseSetDetails {
  actual_weight?: number | null;
  actual_reps?: number | null;
  notes?: string | null;
}

export async function toggleExerciseCompletion(
  userId: number,
  routineId: number,
  dayIndex: number,
  exerciseIndex: number,
  completed: boolean,
  details?: ExerciseSetDetails
): Promise<{ ok: boolean; newlyCompleted: boolean }> {
  const key = `${dayIndex}-${exerciseIndex}`;
  // Only touch weight/reps/notes when the caller actually sent them, so a plain
  // check/uncheck never clobbers a previously logged set.
  const hasDetails =
    details != null &&
    (details.actual_weight != null || details.actual_reps != null || details.notes != null);
  const w = details?.actual_weight ?? null;
  const reps = details?.actual_reps ?? null;
  const notes = details?.notes ?? null;
  try {
    // 1. Verify ownership
    const ownership = await pool.query(
      'SELECT id FROM routines WHERE id = $1 AND user_id = $2',
      [routineId, userId]
    );
    if (ownership.rows.length === 0) {
      console.warn(`User ${userId} attempted to modify routine ${routineId} which helps to someone else (or doesn't exist).`);
      return { ok: false, newlyCompleted: false };
    }

    // Check if completion record exists (and its prior completed state, so XP is
    // only awarded on a genuine transition to completed — not on every save).
    const existing = await pool.query<{ id: number; completed: boolean }>(
      `SELECT id, completed FROM exercise_completions
       WHERE routine_id = $1 AND day_index = $2 AND exercise_index = $3`,
      [routineId, dayIndex, exerciseIndex]
    );
    const wasCompleted = existing.rows.length > 0 && Boolean(existing.rows[0].completed);
    const newlyCompleted = completed === true && !wasCompleted;

    if (existing.rows.length > 0) {
      // Update existing
      if (hasDetails) {
        await pool.query(
          `UPDATE exercise_completions
           SET completed = $4, completed_at = $5, actual_weight = $6, actual_reps = $7, notes = $8
           WHERE routine_id = $1 AND day_index = $2 AND exercise_index = $3`,
          [routineId, dayIndex, exerciseIndex, completed, completed ? new Date() : null, w, reps, notes]
        );
      } else {
        await pool.query(
          `UPDATE exercise_completions
           SET completed = $4, completed_at = $5
           WHERE routine_id = $1 AND day_index = $2 AND exercise_index = $3`,
          [routineId, dayIndex, exerciseIndex, completed, completed ? new Date() : null]
        );
      }
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO exercise_completions (routine_id, day_index, exercise_index, completed, completed_at, actual_weight, actual_reps, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [routineId, dayIndex, exerciseIndex, completed, completed ? new Date() : null, w, reps, notes]
      );
    }
    return { ok: true, newlyCompleted };
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("toggleExerciseCompletion DB failed, using mock:", error);
      // FALLBACK
      if (!mockCompletionStore.has(routineId)) {
        mockCompletionStore.set(routineId, new Map());
      }
      const mockWas = mockCompletionStore.get(routineId)?.get(key) === true;
      mockCompletionStore.get(routineId)?.set(key, completed);
      return { ok: true, newlyCompleted: completed === true && !mockWas };
    }
    console.error("toggleExerciseCompletion DB failed:", error);
    throw error;
  }
}

export async function getDayCompletions(
  userId: number,
  routineId: number
): Promise<Array<{ day_index: number; completed: boolean }>> {
  try {
    const ownership = await pool.query(
      'SELECT id FROM routines WHERE id = $1 AND user_id = $2',
      [routineId, userId]
    );
    if (ownership.rows.length === 0) return [];

    const res = await pool.query<{ day_index: number; completed: boolean }>(
      `SELECT day_index, completed
       FROM day_completions
       WHERE routine_id = $1`,
      [routineId]
    );
    return res.rows.map((r) => ({ day_index: Number(r.day_index), completed: Boolean(r.completed) }));
  } catch (error) {
    if (allowMockAuth()) {
      const store = mockDayCompletionStore.get(routineId);
      if (!store) return [];
      return Array.from(store.entries()).map(([day_index, v]) => ({ day_index, completed: v.completed }));
    }
    console.error("getDayCompletions DB failed:", error);
    throw error;
  }
}

export async function toggleDayCompletion(
  userId: number,
  routineId: number,
  dayIndex: number,
  completed: boolean
): Promise<boolean> {
  try {
    // Verify ownership + fetch routine_json to ensure this is a rest day
    const r = await pool.query<{ routine_json: any }>(
      'SELECT routine_json FROM routines WHERE id = $1 AND user_id = $2',
      [routineId, userId]
    );
    if (r.rows.length === 0) return false;

    let routine_json: any = (r.rows[0] as any).routine_json;
    if (typeof routine_json === 'string') {
      try {
        routine_json = JSON.parse(routine_json);
      } catch {
        routine_json = null;
      }
    }
    const day = Array.isArray(routine_json?.days) ? routine_json.days[dayIndex] : null;
    const isRestDay = Array.isArray(day?.exercises) && day.exercises.length === 0;
    if (!isRestDay) return false;

    await pool.query(
      `INSERT INTO day_completions (routine_id, day_index, completed, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (routine_id, day_index) DO UPDATE
       SET completed = EXCLUDED.completed,
           completed_at = EXCLUDED.completed_at`,
      [routineId, dayIndex, completed, completed ? new Date() : null]
    );
    return true;
  } catch (error) {
    if (allowMockAuth()) {
      if (!mockDayCompletionStore.has(routineId)) mockDayCompletionStore.set(routineId, new Map());
      mockDayCompletionStore.get(routineId)!.set(dayIndex, { completed, completed_at: completed ? new Date() : null });
      return true;
    }
    console.error("toggleDayCompletion DB failed:", error);
    throw error;
  }
}

export async function getCompletionStats(userId: number, routineId: number): Promise<any> {
  try {
    // 1. Verify ownership (users can only see their own completion stats)
    const ownership = await pool.query(
      'SELECT id FROM routines WHERE id = $1 AND user_id = $2',
      [routineId, userId]
    );
    if (ownership.rows.length === 0) {
      // Return empty or throw. Returning empty is safer/quieter for UI.
      return [];
    }

    const result = await pool.query(
      `SELECT day_index, exercise_index, completed, actual_weight, actual_reps, notes
       FROM exercise_completions
       WHERE routine_id = $1`,
      [routineId]
    );
    // actual_weight is DECIMAL -> pg returns it as a string; coerce to number.
    return result.rows.map((r: any) => ({
      day_index: Number(r.day_index),
      exercise_index: Number(r.exercise_index),
      completed: Boolean(r.completed),
      actual_weight: r.actual_weight != null ? Number(r.actual_weight) : null,
      actual_reps: r.actual_reps != null ? Number(r.actual_reps) : null,
      notes: r.notes ?? null,
    }));
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getCompletionStats DB failed, using mock:", error);
      // FALLBACK
      const store = mockCompletionStore.get(routineId);
      if (!store) return [];

      return Array.from(store.entries()).map(([k, v]) => {
        const [d, e] = k.split('-');
        return { day_index: Number(d), exercise_index: Number(e), completed: v };
      });
    }
    console.error("getCompletionStats DB failed:", error);
    throw error;
  }
}

export interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number | null;
  achieved_at: string | null;
}

/**
 * Personal records: heaviest logged weight per exercise across all of a user's
 * routines. Completions store positional indexes, so we resolve the exercise
 * name from each routine's routine_json and group by the normalized name.
 */
export async function getPersonalRecords(userId: number): Promise<PersonalRecord[]> {
  try {
    const res = await pool.query<{
      routine_json: any;
      day_index: number;
      exercise_index: number;
      actual_weight: string | number | null;
      actual_reps: number | null;
      completed_at: Date | null;
    }>(
      `SELECT r.routine_json, ec.day_index, ec.exercise_index,
              ec.actual_weight, ec.actual_reps, ec.completed_at
       FROM exercise_completions ec
       JOIN routines r ON r.id = ec.routine_id
       WHERE r.user_id = $1
         AND ec.actual_weight IS NOT NULL
         AND ec.actual_weight > 0`,
      [userId]
    );

    // key: normalized name -> best record (with original display name)
    const best = new Map<string, PersonalRecord>();

    for (const row of res.rows) {
      let routine: any = row.routine_json;
      if (typeof routine === 'string') {
        try { routine = JSON.parse(routine); } catch { continue; }
      }
      const ex = Array.isArray(routine?.days)
        ? routine.days[row.day_index]?.exercises?.[row.exercise_index]
        : null;
      const name = typeof ex?.name === 'string' ? ex.name.trim() : '';
      if (!name) continue;

      const weight = Number(row.actual_weight);
      if (!Number.isFinite(weight) || weight <= 0) continue;

      const k = name.toLowerCase();
      const prev = best.get(k);
      const record: PersonalRecord = {
        exercise: name,
        weight,
        reps: row.actual_reps != null ? Number(row.actual_reps) : null,
        achieved_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      };
      // Keep the heaviest; tie-break on reps, then recency.
      if (
        !prev ||
        weight > prev.weight ||
        (weight === prev.weight && (record.reps ?? 0) > (prev.reps ?? 0))
      ) {
        best.set(k, record);
      }
    }

    return Array.from(best.values()).sort((a, b) => b.weight - a.weight);
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getPersonalRecords DB failed, using mock:", error);
      return [];
    }
    console.error("getPersonalRecords DB failed:", error);
    throw error;
  }
}

export async function deleteAllUserRoutines(userId: number): Promise<void> {
  try {
    // Due to ON DELETE CASCADE constraints, deleting routines will automatically
    // delete associated exercise_completions.
    await pool.query(
      'DELETE FROM routines WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("deleteAllUserRoutines DB failed, clearing mock stores:", error);
      // Clear mock data for this user
      for (const [key, val] of mockRoutineStore.entries()) {
        if (val.user_id === userId) mockRoutineStore.delete(key);
      }
      return;
    }
    console.error("deleteAllUserRoutines DB failed:", error);
    throw error;
  }
}
