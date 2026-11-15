// Coach bookings and the coach marketplace.
import { pool } from './core';

// ============= COACH BOOKINGS (PREMIUM/TRIAL) =============

export type CoachBooking = {
  id: number;
  user_id: number;
  coach_name: string;
  coach_phone: string;
  coach_email: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  coach_id: number | null;
  preferred_at: Date | null;
  message: string | null;
  status: string;
  created_at: Date;
};

export type AdminCoachBookingRow = {
  id: number;
  user_id: number;
  username: string | null;
  coach_name: string;
  coach_phone: string;
  coach_email: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  coach_id: number | null;
  preferred_at: Date | null;
  message: string | null;
  status: string;
  created_at: Date;
};

function safeDateOrNull(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export async function createCoachBooking(input: {
  userId: number;
  coach: { name: string; phone: string; email: string };
  user?: { name?: string | null; email?: string | null; phone?: string | null };
  coachId?: number | null;
  preferredAt?: string | null;
  message?: string | null;
}): Promise<Pick<CoachBooking, "id" | "status" | "created_at">> {
  const preferredAt = safeDateOrNull(input.preferredAt ?? null);
  const message = typeof input.message === "string" && input.message.trim() ? input.message.trim() : null;
  const user_name = typeof input.user?.name === "string" && input.user.name.trim() ? input.user.name.trim() : null;
  const user_email = typeof input.user?.email === "string" && input.user.email.trim() ? input.user.email.trim() : null;
  const user_phone = typeof input.user?.phone === "string" && input.user.phone.trim() ? input.user.phone.trim() : null;
  const coach_id = typeof input.coachId === "number" && Number.isFinite(input.coachId) ? Math.floor(input.coachId) : null;

  const res = await pool.query<Pick<CoachBooking, "id" | "status" | "created_at">>(
    `INSERT INTO coach_bookings (user_id, coach_name, coach_phone, coach_email, user_name, user_email, user_phone, coach_id, preferred_at, message, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
     RETURNING id, status, created_at`,
    [input.userId, input.coach.name, input.coach.phone, input.coach.email, user_name, user_email, user_phone, coach_id, preferredAt, message]
  );

  const row = res.rows?.[0];
  if (!row) throw new Error("Failed to create booking");
  return row;
}

export async function listCoachBookings(userId: number, limit = 10): Promise<CoachBooking[]> {
  const lim = Math.max(1, Math.min(50, Math.floor(limit)));
  const res = await pool.query<CoachBooking>(
    `SELECT id, user_id, coach_name, coach_phone, coach_email, user_name, user_email, user_phone, coach_id, preferred_at, message, status, created_at
     FROM coach_bookings
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, lim]
  );

  // Ensure `preferred_at` is a Date in JS
  return res.rows.map((r: any) => ({
    ...r,
    preferred_at: r.preferred_at ? (r.preferred_at instanceof Date ? r.preferred_at : new Date(String(r.preferred_at))) : null,
    created_at: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  }));
}

export async function getActiveCoachBookingForUser(userId: number): Promise<Pick<
  CoachBooking,
  "id" | "user_id" | "coach_id" | "coach_name" | "preferred_at" | "status" | "created_at"
> | null> {
  const res = await pool.query<any>(
    `SELECT id, user_id, coach_id, coach_name, preferred_at, status, created_at
     FROM coach_bookings
     WHERE user_id = $1 AND status IN ('pending', 'confirmed')
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  const r = res.rows?.[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    coach_id: r.coach_id != null ? Number(r.coach_id) : null,
    coach_name: String(r.coach_name),
    preferred_at: r.preferred_at ? (r.preferred_at instanceof Date ? r.preferred_at : new Date(String(r.preferred_at))) : null,
    status: String(r.status || ""),
    created_at: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  };
}

export async function getCoachBookingByIdForUser(
  userId: number,
  id: number
): Promise<CoachBooking | null> {
  const bid = Math.floor(Number(id));
  if (!Number.isFinite(bid) || bid <= 0) return null;
  const res = await pool.query<any>(
    `SELECT id, user_id, coach_name, coach_phone, coach_email, user_name, user_email, user_phone, coach_id, preferred_at, message, status, created_at
     FROM coach_bookings
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [bid, userId]
  );
  const r = res.rows?.[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    coach_name: String(r.coach_name),
    coach_phone: String(r.coach_phone),
    coach_email: String(r.coach_email),
    user_name: r.user_name ?? null,
    user_email: r.user_email ?? null,
    user_phone: r.user_phone ?? null,
    coach_id: r.coach_id != null ? Number(r.coach_id) : null,
    preferred_at: r.preferred_at ? (r.preferred_at instanceof Date ? r.preferred_at : new Date(String(r.preferred_at))) : null,
    message: r.message ?? null,
    status: String(r.status || ""),
    created_at: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  };
}

export async function updateCoachBookingStatusForUser(input: {
  userId: number;
  id: number;
  status: string;
}): Promise<boolean> {
  const id = Math.floor(Number(input.id));
  const userId = Math.floor(Number(input.userId));
  const status = String(input.status || "").trim();
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid booking id");
  if (!Number.isFinite(userId) || userId <= 0) throw new Error("Invalid user id");
  if (!status) throw new Error("Invalid status");

  const res = await pool.query(
    `UPDATE coach_bookings
     SET status = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2`,
    [id, userId, status]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function deleteCoachBookingForUser(input: { userId: number; id: number }): Promise<boolean> {
  const id = Math.floor(Number(input.id));
  const userId = Math.floor(Number(input.userId));
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid booking id");
  if (!Number.isFinite(userId) || userId <= 0) throw new Error("Invalid user id");
  const res = await pool.query(`DELETE FROM coach_bookings WHERE id = $1 AND user_id = $2`, [id, userId]);
  return (res.rowCount ?? 0) > 0;
}

export async function listAllCoachBookingsAdmin(opts?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminCoachBookingRow[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(opts?.limit ?? 50)));
  const offset = Math.max(0, Math.floor(opts?.offset ?? 0));
  const status = typeof opts?.status === "string" && opts.status.trim() ? opts.status.trim() : null;

  const res = await pool.query<AdminCoachBookingRow>(
    `
    SELECT cb.id, cb.user_id, u.username, cb.coach_name, cb.coach_phone, cb.coach_email,
           cb.user_name, cb.user_email, cb.user_phone,
           cb.coach_id,
           cb.preferred_at, cb.message, cb.status, cb.created_at
    FROM coach_bookings cb
    LEFT JOIN users u ON u.id = cb.user_id
    WHERE ($1::text IS NULL OR cb.status = $1)
    ORDER BY cb.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [status, limit, offset]
  );

  return res.rows.map((r: any) => ({
    ...r,
    preferred_at: r.preferred_at ? (r.preferred_at instanceof Date ? r.preferred_at : new Date(String(r.preferred_at))) : null,
    created_at: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  }));
}

export async function updateCoachBookingStatusAdmin(input: {
  id: number;
  status: string;
}): Promise<boolean> {
  const id = Math.floor(Number(input.id));
  const status = String(input.status || "").trim();
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid booking id");
  if (!status) throw new Error("Invalid status");

  const res = await pool.query(
    `UPDATE coach_bookings
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, status]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function getCoachBookingByIdAdmin(id: number): Promise<{
  id: number;
  user_id: number;
  coach_id: number | null;
  coach_name: string;
  coach_phone: string;
  coach_email: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  preferred_at: Date | null;
  message: string | null;
  status: string;
  created_at: Date;
} | null> {
  const bid = Math.floor(Number(id));
  if (!Number.isFinite(bid) || bid <= 0) return null;
  const res = await pool.query<any>(
    `SELECT id, user_id, coach_id, coach_name, coach_phone, coach_email, user_name, user_email, user_phone,
            preferred_at, message, status, created_at
     FROM coach_bookings
     WHERE id = $1
     LIMIT 1`,
    [bid]
  );
  const r = res.rows?.[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    coach_id: r.coach_id != null ? Number(r.coach_id) : null,
    coach_name: String(r.coach_name),
    coach_phone: String(r.coach_phone),
    coach_email: String(r.coach_email),
    user_name: r.user_name ?? null,
    user_email: r.user_email ?? null,
    user_phone: r.user_phone ?? null,
    preferred_at: r.preferred_at ? (r.preferred_at instanceof Date ? r.preferred_at : new Date(String(r.preferred_at))) : null,
    message: r.message ?? null,
    status: String(r.status || ""),
    created_at: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  };
}

// ============= COACH MARKETPLACE (SIGNUP + APPROVAL) =============

export type CoachStatus = "pending" | "approved" | "rejected";

export type CoachApplication = {
  id: number;
  user_id: number;
  status: CoachStatus;
  admin_notes: string | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CoachProfile = {
  coach_id: number;
  display_name: string;
  bio: string | null;
  experience_years: number | null;
  certifications: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  timezone: string | null;
  phone: string | null;
  email: string | null;
  updated_at?: Date;
};

export type CoachPublic = {
  coach_id: number;
  status: CoachStatus;
  display_name: string;
  bio: string | null;
  experience_years: number | null;
  certifications: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  timezone: string | null;
  phone: string | null;
  email: string | null;
};

export async function getCoachApplicationByUserId(userId: number): Promise<CoachApplication | null> {
  const res = await pool.query<CoachApplication>(
    `SELECT id, user_id, status, admin_notes, approved_at, rejected_at, created_at, updated_at
     FROM coaches
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return (res.rows?.[0] as any) ?? null;
}

export async function getApprovedCoachIdByUserId(userId: number): Promise<number | null> {
  const res = await pool.query<{ id: number }>(
    `SELECT id FROM coaches WHERE user_id = $1 AND status = 'approved' LIMIT 1`,
    [userId]
  );
  const id = Number(res.rows?.[0]?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function createCoachApplication(input: {
  userId: number;
  profile: Omit<CoachProfile, "coach_id">;
}): Promise<{ coachId: number; status: CoachStatus }> {
  // Upsert coaches row per user
  const coachRes = await pool.query<{ id: number; status: CoachStatus }>(
    `INSERT INTO coaches (user_id, status)
     VALUES ($1, 'pending')
     ON CONFLICT (user_id) DO UPDATE
     SET status = CASE WHEN coaches.status = 'approved' THEN 'approved' ELSE 'pending' END,
         updated_at = CURRENT_TIMESTAMP
     RETURNING id, status`,
    [input.userId]
  );
  const coachId = Number(coachRes.rows?.[0]?.id);
  const status = (coachRes.rows?.[0]?.status as CoachStatus) || "pending";
  if (!Number.isFinite(coachId) || coachId <= 0) throw new Error("Failed to create coach application");

  // Upsert profile
  await pool.query(
    `INSERT INTO coach_profiles (coach_id, display_name, bio, experience_years, certifications, specialties, languages, timezone, phone, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'Asia/Kolkata'), $9, $10)
     ON CONFLICT (coach_id) DO UPDATE
     SET display_name = EXCLUDED.display_name,
         bio = EXCLUDED.bio,
         experience_years = EXCLUDED.experience_years,
         certifications = EXCLUDED.certifications,
         specialties = EXCLUDED.specialties,
         languages = EXCLUDED.languages,
         timezone = COALESCE(EXCLUDED.timezone, coach_profiles.timezone),
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         updated_at = CURRENT_TIMESTAMP`,
    [
      coachId,
      input.profile.display_name,
      input.profile.bio ?? null,
      typeof input.profile.experience_years === "number" ? Math.floor(input.profile.experience_years) : null,
      input.profile.certifications ?? null,
      input.profile.specialties ?? null,
      input.profile.languages ?? null,
      input.profile.timezone ?? "Asia/Kolkata",
      input.profile.phone ?? null,
      input.profile.email ?? null,
    ]
  );

  return { coachId, status };
}

export async function updateCoachProfileByUser(input: {
  userId: number;
  profile: Partial<Omit<CoachProfile, "coach_id">>;
}): Promise<boolean> {
  const app = await getCoachApplicationByUserId(input.userId);
  if (!app) return false;

  // Fetch existing profile to preserve required display_name
  const existing = await pool.query<{ display_name: string }>(
    `SELECT display_name FROM coach_profiles WHERE coach_id = $1 LIMIT 1`,
    [app.id]
  );
  const existingName = existing.rows?.[0]?.display_name;
  const display_name =
    typeof input.profile.display_name === "string" && input.profile.display_name.trim()
      ? input.profile.display_name.trim()
      : existingName;
  if (!display_name) throw new Error("display_name is required");

  await pool.query(
    `INSERT INTO coach_profiles (coach_id, display_name, bio, experience_years, certifications, specialties, languages, timezone, phone, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'Asia/Kolkata'), $9, $10)
     ON CONFLICT (coach_id) DO UPDATE
     SET display_name = EXCLUDED.display_name,
         bio = EXCLUDED.bio,
         experience_years = EXCLUDED.experience_years,
         certifications = EXCLUDED.certifications,
         specialties = EXCLUDED.specialties,
         languages = EXCLUDED.languages,
         timezone = COALESCE(EXCLUDED.timezone, coach_profiles.timezone),
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         updated_at = CURRENT_TIMESTAMP`,
    [
      app.id,
      display_name,
      input.profile.bio ?? null,
      typeof input.profile.experience_years === "number" ? Math.floor(input.profile.experience_years) : null,
      input.profile.certifications ?? null,
      (input.profile.specialties as any) ?? null,
      (input.profile.languages as any) ?? null,
      input.profile.timezone ?? "Asia/Kolkata",
      input.profile.phone ?? null,
      input.profile.email ?? null,
    ]
  );
  return true;
}

export async function getCoachProfileByCoachId(coachId: number): Promise<CoachProfile | null> {
  const id = Math.floor(Number(coachId));
  if (!Number.isFinite(id) || id <= 0) return null;
  const res = await pool.query<CoachProfile>(
    `SELECT coach_id, display_name, bio, experience_years, certifications, specialties, languages, timezone, phone, email, updated_at
     FROM coach_profiles
     WHERE coach_id = $1
     LIMIT 1`,
    [id]
  );
  return (res.rows?.[0] as any) ?? null;
}

export async function listApprovedCoachesPublic(limit = 50): Promise<CoachPublic[]> {
  const lim = Math.max(1, Math.min(100, Math.floor(limit)));
  const res = await pool.query<CoachPublic>(
    `SELECT c.id AS coach_id, c.status,
            p.display_name, p.bio, p.experience_years, p.certifications, p.specialties, p.languages, p.timezone, p.phone, p.email
     FROM coaches c
     JOIN coach_profiles p ON p.coach_id = c.id
     WHERE c.status = 'approved'
     ORDER BY c.approved_at DESC NULLS LAST, c.created_at DESC
     LIMIT $1`,
    [lim]
  );
  return res.rows as any;
}

export async function getApprovedCoachPublicById(coachId: number): Promise<CoachPublic | null> {
  const id = Math.floor(Number(coachId));
  if (!Number.isFinite(id) || id <= 0) return null;
  const res = await pool.query<CoachPublic>(
    `SELECT c.id AS coach_id, c.status,
            p.display_name, p.bio, p.experience_years, p.certifications, p.specialties, p.languages, p.timezone, p.phone, p.email
     FROM coaches c
     JOIN coach_profiles p ON p.coach_id = c.id
     WHERE c.id = $1 AND c.status = 'approved'
     LIMIT 1`,
    [id]
  );
  return (res.rows?.[0] as any) ?? null;
}

export async function listCoachApplicationsAdmin(opts?: { status?: CoachStatus; limit?: number }): Promise<Array<CoachApplication & { username: string | null; profile: CoachProfile | null }>> {
  const status = opts?.status ?? "pending";
  const lim = Math.max(1, Math.min(200, Math.floor(opts?.limit ?? 50)));
  const res = await pool.query<any>(
    `SELECT c.id, c.user_id, c.status, c.admin_notes, c.approved_at, c.rejected_at, c.created_at, c.updated_at,
            u.username,
            p.display_name, p.bio, p.experience_years, p.certifications, p.specialties, p.languages, p.timezone, p.phone, p.email, p.updated_at AS profile_updated_at
     FROM coaches c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN coach_profiles p ON p.coach_id = c.id
     WHERE c.status = $1
     ORDER BY c.created_at DESC
     LIMIT $2`,
    [status, lim]
  );
  return res.rows.map((r: any) => ({
    id: Number(r.id),
    user_id: Number(r.user_id),
    status: r.status as CoachStatus,
    admin_notes: r.admin_notes ?? null,
    approved_at: r.approved_at ? new Date(String(r.approved_at)) : null,
    rejected_at: r.rejected_at ? new Date(String(r.rejected_at)) : null,
    created_at: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
    updated_at: r.updated_at instanceof Date ? r.updated_at : new Date(String(r.updated_at)),
    username: typeof r.username === "string" ? r.username : null,
    profile: r.display_name
      ? {
        coach_id: Number(r.id),
        display_name: String(r.display_name),
        bio: r.bio ?? null,
        experience_years: r.experience_years != null ? Number(r.experience_years) : null,
        certifications: r.certifications ?? null,
        specialties: Array.isArray(r.specialties) ? r.specialties : null,
        languages: Array.isArray(r.languages) ? r.languages : null,
        timezone: r.timezone ?? null,
        phone: r.phone ?? null,
        email: r.email ?? null,
        updated_at: r.profile_updated_at ? new Date(String(r.profile_updated_at)) : undefined,
      }
      : null,
  }));
}

export async function setCoachApplicationStatusAdmin(input: {
  coachId: number;
  status: CoachStatus;
  adminNotes?: string | null;
}): Promise<boolean> {
  const id = Math.floor(Number(input.coachId));
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid coach id");
  const status = input.status;
  const notes = typeof input.adminNotes === "string" && input.adminNotes.trim() ? input.adminNotes.trim() : null;
  const res = await pool.query(
    `UPDATE coaches
     SET status = $2,
         admin_notes = $3,
         approved_at = CASE WHEN $2 = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END,
         rejected_at = CASE WHEN $2 = 'rejected' THEN CURRENT_TIMESTAMP ELSE rejected_at END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, status, notes]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function listAssignedCoachBookings(coachId: number, limit = 50, offset = 0): Promise<Array<{
  id: number;
  coach_id: number;
  coach_name: string;
  status: string;
  preferred_at: Date | null;
  message: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  created_at: Date;
}>> {
  const cid = Math.floor(Number(coachId));
  if (!Number.isFinite(cid) || cid <= 0) return [];
  const lim = Math.max(1, Math.min(100, Math.floor(limit)));
  const off = Math.max(0, Math.floor(offset));
  const res = await pool.query<any>(
    `SELECT id, coach_id, coach_name, status, preferred_at, message, user_name, user_email, user_phone, created_at
     FROM coach_bookings
     WHERE coach_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [cid, lim, off]
  );
  return res.rows.map((r: any) => ({
    id: Number(r.id),
    coach_id: Number(r.coach_id),
    coach_name: String(r.coach_name),
    status: String(r.status),
    preferred_at: r.preferred_at ? (r.preferred_at instanceof Date ? r.preferred_at : new Date(String(r.preferred_at))) : null,
    message: r.message ?? null,
    user_name: r.user_name ?? null,
    user_email: r.user_email ?? null,
    user_phone: r.user_phone ?? null,
    created_at: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
  }));
}
