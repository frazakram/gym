import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withCors } from '@/lib/corsMiddleware'
import { getSession } from '@/lib/auth'
import { initializeDatabase, countryToRegion, saveNationality } from '@/lib/db'
import { Pool } from '@neondatabase/serverless'
import { safeParseWithError } from '@/lib/validations'
import { sanitizeUntrustedText } from '@/lib/prompt-safety'
import { redisGetJson, redisSetJson, getRedis } from '@/lib/redis'

export const runtime = 'nodejs'

function getPool(): Pool {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED ||
    ''
  return new Pool({ connectionString })
}

const LocationPostSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().max(200).optional(),
  country: z.string().regex(/^[A-Za-z]{2}$/).optional(),
  source: z.string().max(40),
})

let columnsEnsured = false
async function ensureLocationColumns(pool: Pool) {
  if (columnsEnsured) return
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS last_city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ
  `)
  columnsEnsured = true
}

type StoredLocation = {
  lat: number | null
  lng: number | null
  city: string | null
  location_updated_at: string | null
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    await initializeDatabase()

    const cacheKey = `location:${session.userId}`
    const cached = await redisGetJson<StoredLocation>(cacheKey)
    if (cached) return withCors(NextResponse.json(cached))

    const pool = getPool()
    await ensureLocationColumns(pool)

    const res = await pool.query<{
      last_lat: number | null
      last_lng: number | null
      last_city: string | null
      location_updated_at: Date | null
    }>(
      'SELECT last_lat, last_lng, last_city, location_updated_at FROM users WHERE id = $1',
      [session.userId],
    )

    const row = res.rows[0]
    const payload: StoredLocation = {
      lat: row?.last_lat ?? null,
      lng: row?.last_lng ?? null,
      city: row?.last_city ?? null,
      location_updated_at: row?.location_updated_at
        ? new Date(row.location_updated_at).toISOString()
        : null,
    }

    await redisSetJson(cacheKey, payload, 300)
    return withCors(NextResponse.json(payload))
  } catch (error) {
    console.error('GET /api/user-location failed:', error)
    return withCors(
      NextResponse.json({ lat: null, lng: null, city: null, location_updated_at: null }),
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    await initializeDatabase()

    const parsed = safeParseWithError(
      LocationPostSchema,
      await request.json().catch(() => ({})),
    )
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }))
    }

    const { lat, lng } = parsed.data
    const cleanCity = parsed.data.city
      ? sanitizeUntrustedText(parsed.data.city, { maxChars: 100 }) || null
      : null

    const pool = getPool()
    await ensureLocationColumns(pool)

    await pool.query(
      `UPDATE users
         SET last_lat = $1,
             last_lng = $2,
             last_city = $3,
             location_updated_at = NOW()
       WHERE id = $4`,
      [lat, lng, cleanCity, session.userId],
    )

    // If we got a country code AND the profile has no nationality yet,
    // populate it (and the derived region) from the detected location.
    // We do NOT overwrite a manual choice the user already made.
    let appliedNationality: string | null = null
    let appliedRegion: 'APAC' | 'EMEA' | 'NA' | 'LATAM' | null = null
    const detectedCountry = parsed.data.country?.toUpperCase() ?? null
    if (detectedCountry) {
      try {
        const existing = await pool.query<{ nationality: string | null }>(
          'SELECT nationality FROM profiles WHERE user_id = $1',
          [session.userId],
        )
        const current = existing.rows[0]?.nationality
        if (!current || current.trim() === '') {
          const region = countryToRegion(detectedCountry)
          await saveNationality(session.userId, detectedCountry, region)
          appliedNationality = detectedCountry
          appliedRegion = region
        }
      } catch (e) {
        console.error('auto-nationality update failed:', e)
      }
    }

    // Bust caches (no-op if Redis unavailable)
    try {
      const r = getRedis()
      if (r) {
        await r.del(`profile:${session.userId}`)
        await r.del(`location:${session.userId}`)
      }
    } catch {
      // ignore cache bust failures
    }

    return withCors(
      NextResponse.json({
        ok: true,
        city: cleanCity,
        nationality: appliedNationality,
        region: appliedRegion,
      }),
    )
  } catch (error) {
    console.error('POST /api/user-location failed:', error)
    return withCors(NextResponse.json({ error: 'Failed to save location' }, { status: 500 }))
  }
}
