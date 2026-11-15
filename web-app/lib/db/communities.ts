// Communities and leaderboards.
import { decrypt } from '@/lib/fieldEncryption';
import { pool } from './core';

// ============= COMMUNITIES =============

export type CommunityType = 'custom' | 'worldwide';

export type Region = 'APAC' | 'EMEA' | 'NA' | 'LATAM';

export type Community = {
  id: number;
  name: string;
  description: string | null;
  type: CommunityType;
  region: Region | null;
  join_code: string | null;
  created_by: number | null;
  member_count: number;
  member_cap: number | null;
  created_at: string;
};

export type CommunityMember = {
  user_id: number;
  username: string;
  total_xp: number;
  current_streak: number;
  nationality: string | null;
  joined_at: string;
};

const REJOIN_COOLDOWN_HOURS = 6;

const CUSTOM_COMMUNITY_CAP = 100;

function generateJoinCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function rowToCommunity(r: any): Community {
  return {
    id: Number(r.id),
    name: String(r.name),
    description: r.description ?? null,
    type: r.type as CommunityType,
    region: r.region ?? null,
    join_code: r.join_code ?? null,
    created_by: r.created_by != null ? Number(r.created_by) : null,
    member_count: Number(r.member_count || 0),
    member_cap: r.member_cap != null ? Number(r.member_cap) : null,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

export async function getMyCommunity(userId: number): Promise<Community | null> {
  try {
    const res = await pool.query(
      `SELECT c.* FROM community_members m JOIN communities c ON c.id = m.community_id WHERE m.user_id = $1`,
      [userId]
    );
    if (res.rows.length === 0) return null;
    return rowToCommunity(res.rows[0]);
  } catch (error) {
    console.error("getMyCommunity failed:", error);
    return null;
  }
}

export async function getCommunityById(communityId: number): Promise<Community | null> {
  try {
    const res = await pool.query(`SELECT * FROM communities WHERE id = $1`, [communityId]);
    if (res.rows.length === 0) return null;
    return rowToCommunity(res.rows[0]);
  } catch (error) {
    console.error("getCommunityById failed:", error);
    return null;
  }
}

export async function getCommunityByJoinCode(code: string): Promise<Community | null> {
  try {
    const res = await pool.query(`SELECT * FROM communities WHERE join_code = $1`, [code.toUpperCase()]);
    if (res.rows.length === 0) return null;
    return rowToCommunity(res.rows[0]);
  } catch (error) {
    console.error("getCommunityByJoinCode failed:", error);
    return null;
  }
}

export async function listWorldwideCommunities(limit = 50, offset = 0): Promise<Community[]> {
  try {
    const lim = Math.max(1, Math.min(200, Math.floor(limit)));
    const off = Math.max(0, Math.floor(offset));
    const res = await pool.query(
      `SELECT * FROM communities WHERE type = 'worldwide' ORDER BY region ASC LIMIT $1 OFFSET $2`,
      [lim, off]
    );
    return res.rows.map(rowToCommunity);
  } catch (error) {
    console.error("listWorldwideCommunities failed:", error);
    return [];
  }
}

export async function joinCommunity(
  userId: number,
  communityId: number
): Promise<null | 'already_in_community' | 'cooldown' | 'community_full' | 'not_found' | 'error'> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(`SELECT community_id FROM community_members WHERE user_id = $1`, [userId]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return 'already_in_community';
    }

    const cooldown = await client.query(
      `SELECT 1 FROM community_leave_log
       WHERE user_id = $1 AND left_at > NOW() - INTERVAL '${REJOIN_COOLDOWN_HOURS} hours'
       LIMIT 1`,
      [userId]
    );
    if (cooldown.rows.length > 0) {
      await client.query('ROLLBACK');
      return 'cooldown';
    }

    const c = await client.query(
      `SELECT id, member_count, member_cap FROM communities WHERE id = $1 FOR UPDATE`,
      [communityId]
    );
    if (c.rows.length === 0) {
      await client.query('ROLLBACK');
      return 'not_found';
    }
    const row = c.rows[0];
    const cap = row.member_cap != null ? Number(row.member_cap) : null;
    if (cap != null && Number(row.member_count) >= cap) {
      await client.query('ROLLBACK');
      return 'community_full';
    }

    await client.query(
      `INSERT INTO community_members (user_id, community_id) VALUES ($1, $2)`,
      [userId, communityId]
    );
    await client.query(
      `UPDATE communities SET member_count = member_count + 1 WHERE id = $1`,
      [communityId]
    );
    await client.query('COMMIT');
    return null;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error("joinCommunity failed:", error);
    return 'error';
  } finally {
    client.release();
  }
}

export async function leaveCommunity(userId: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT community_id FROM community_members WHERE user_id = $1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    const cid = Number(existing.rows[0].community_id);
    await client.query(`DELETE FROM community_members WHERE user_id = $1`, [userId]);
    await client.query(
      `UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1`,
      [cid]
    );
    await client.query(
      `INSERT INTO community_leave_log (user_id, community_id) VALUES ($1, $2)`,
      [userId, cid]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error("leaveCommunity failed:", error);
    return false;
  } finally {
    client.release();
  }
}

export async function createCustomCommunity(
  userId: number,
  name: string,
  description?: string | null
): Promise<{ community: Community | null; error?: 'already_in_community' | 'cooldown' | 'error' }> {
  const trimmedName = name.trim();
  const trimmedDesc = description?.trim() || null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(`SELECT 1 FROM community_members WHERE user_id = $1`, [userId]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return { community: null, error: 'already_in_community' };
    }

    const cooldown = await client.query(
      `SELECT 1 FROM community_leave_log
       WHERE user_id = $1 AND left_at > NOW() - INTERVAL '${REJOIN_COOLDOWN_HOURS} hours'
       LIMIT 1`,
      [userId]
    );
    if (cooldown.rows.length > 0) {
      await client.query('ROLLBACK');
      return { community: null, error: 'cooldown' };
    }

    let joinCode = '';
    for (let i = 0; i < 6; i++) {
      const candidate = generateJoinCode();
      const dupe = await client.query(`SELECT 1 FROM communities WHERE join_code = $1`, [candidate]);
      if (dupe.rows.length === 0) { joinCode = candidate; break; }
    }
    if (!joinCode) {
      await client.query('ROLLBACK');
      return { community: null, error: 'error' };
    }

    const insertRes = await client.query(
      `INSERT INTO communities (name, description, type, join_code, created_by, member_count, member_cap)
       VALUES ($1, $2, 'custom', $3, $4, 1, $5) RETURNING *`,
      [trimmedName, trimmedDesc, joinCode, userId, CUSTOM_COMMUNITY_CAP]
    );
    const community = rowToCommunity(insertRes.rows[0]);

    await client.query(
      `INSERT INTO community_members (user_id, community_id) VALUES ($1, $2)`,
      [userId, community.id]
    );

    await client.query('COMMIT');
    return { community };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error("createCustomCommunity failed:", error);
    return { community: null, error: 'error' };
  } finally {
    client.release();
  }
}

export async function getCommunityLeaderboard(
  communityId: number,
  limit: number = 100,
  offset: number = 0
): Promise<CommunityMember[]> {
  try {
    const lim = Math.max(1, Math.min(500, Math.floor(limit)));
    const off = Math.max(0, Math.floor(offset));
    const res = await pool.query(
      `SELECT
         m.user_id,
         u.username,
         COALESCE(x.total_xp, 0) AS total_xp,
         COALESCE(x.last_streak_value, 0) AS current_streak,
         p.nationality,
         m.joined_at
       FROM community_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN user_xp x ON x.user_id = m.user_id
       LEFT JOIN profiles p ON p.user_id = m.user_id
       WHERE m.community_id = $1
       ORDER BY total_xp DESC, m.joined_at ASC
       LIMIT $2 OFFSET $3`,
      [communityId, lim, off]
    );
    return res.rows.map((r: any) => ({
      user_id: Number(r.user_id),
      username: decrypt(String(r.username)),
      total_xp: Number(r.total_xp || 0),
      current_streak: Number(r.current_streak || 0),
      nationality: r.nationality ?? null,
      joined_at: r.joined_at instanceof Date ? r.joined_at.toISOString() : String(r.joined_at),
    }));
  } catch (error) {
    console.error("getCommunityLeaderboard failed:", error);
    return [];
  }
}

export async function getRejoinCooldownExpiry(userId: number): Promise<string | null> {
  try {
    const res = await pool.query<{ left_at: Date | string }>(
      `SELECT left_at FROM community_leave_log
       WHERE user_id = $1 AND left_at > NOW() - INTERVAL '${REJOIN_COOLDOWN_HOURS} hours'
       ORDER BY left_at DESC LIMIT 1`,
      [userId]
    );
    if (res.rows.length === 0) return null;
    const left = res.rows[0].left_at instanceof Date ? res.rows[0].left_at : new Date(String(res.rows[0].left_at));
    const expiry = new Date(left.getTime() + REJOIN_COOLDOWN_HOURS * 3600 * 1000);
    return expiry.toISOString();
  } catch (error) {
    console.error("getRejoinCooldownExpiry failed:", error);
    return null;
  }
}

export async function getOrCreateRegionalCommunityId(region: Region): Promise<number | null> {
  try {
    const res = await pool.query(
      `SELECT id FROM communities WHERE type = 'worldwide' AND region = $1 LIMIT 1`,
      [region]
    );
    if (res.rows.length > 0) return Number(res.rows[0].id);
    const created = await pool.query(
      `INSERT INTO communities (name, description, type, region, member_cap)
       VALUES ($1, $2, 'worldwide', $3, NULL) RETURNING id`,
      [`Worldwide — ${region}`, `${region} region community`, region]
    );
    return Number(created.rows[0].id);
  } catch (error) {
    console.error("getOrCreateRegionalCommunityId failed:", error);
    return null;
  }
}
