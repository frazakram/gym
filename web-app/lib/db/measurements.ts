// Body measurements.
import { pool } from './core';

// ============= STREAK DATA (FREE — lightweight query) =============

// ============= BODY MEASUREMENTS (FREE) =============

export interface BodyMeasurement {
  id: number;
  user_id: number;
  measured_at: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  arms: number | null;
  hips: number | null;
  notes: string | null;
  created_at: string;
}

export async function getBodyMeasurements(userId: number, limit = 90, offset = 0): Promise<BodyMeasurement[]> {
  try {
    const lim = Math.max(1, Math.min(500, Math.floor(limit)));
    const off = Math.max(0, Math.floor(offset));
    const res = await pool.query<BodyMeasurement>(
      `SELECT id, user_id, measured_at::text, weight, waist, chest, arms, hips, notes, created_at
       FROM body_measurements
       WHERE user_id = $1
       ORDER BY measured_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, lim, off]
    );
    return res.rows.map((r) => ({
      ...r,
      weight: r.weight != null ? Number(r.weight) : null,
      waist: r.waist != null ? Number(r.waist) : null,
      chest: r.chest != null ? Number(r.chest) : null,
      arms: r.arms != null ? Number(r.arms) : null,
      hips: r.hips != null ? Number(r.hips) : null,
    }));
  } catch (error) {
    console.error("getBodyMeasurements failed:", error);
    return [];
  }
}

export async function addBodyMeasurement(
  userId: number,
  data: { measured_at: string; weight?: number; waist?: number; chest?: number; arms?: number; hips?: number; notes?: string }
): Promise<BodyMeasurement | null> {
  try {
    // use module-level pool
    const res = await pool.query<BodyMeasurement>(
      `INSERT INTO body_measurements (user_id, measured_at, weight, waist, chest, arms, hips, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, measured_at::text, weight, waist, chest, arms, hips, notes, created_at`,
      [userId, data.measured_at, data.weight ?? null, data.waist ?? null, data.chest ?? null, data.arms ?? null, data.hips ?? null, data.notes ?? null]
    );
    return res.rows[0] ?? null;
  } catch (error) {
    console.error("addBodyMeasurement failed:", error);
    return null;
  }
}

export async function deleteBodyMeasurement(userId: number, id: number): Promise<boolean> {
  try {
    // use module-level pool
    const res = await pool.query(
      `DELETE FROM body_measurements WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("deleteBodyMeasurement failed:", error);
    return false;
  }
}
