import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { User, Profile } from '@/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { encryptDet, encryptRnd, decrypt } from '@/lib/fieldEncryption';

function isPostgresUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("postgres://") || v.startsWith("postgresql://");
}

function firstEnv(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    if (!isPostgresUrl(trimmed)) continue;
    return trimmed;
  }
  return "";
}

const connectionString = firstEnv(
  // Common names (recommended)
  "POSTGRES_URL",
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_PRISMA_URL",
  // Namespaced variants (some Vercel/Neon setups)
  "gym_POSTGRES_URL",
  "gym_DATABASE_URL",
  "gym_POSTGRES_URL_NON_POOLING",
  "gym_DATABASE_URL_UNPOOLED",
  "gym_POSTGRES_PRISMA_URL"
);

/**
 * SSL Configuration for Database Connection
 * 
 * Production: Full SSL verification enabled by default
 * Development: Can be disabled with DB_SSL_REJECT_UNAUTHORIZED=false
 * 
 * For Neon/Vercel: SSL is required but hostname verification may need adjustment
 * Set DB_SSL_MODE=require for cloud databases that use connection poolers
 */
function getSslConfig(): false | { rejectUnauthorized: boolean; checkServerIdentity?: () => undefined } {
  // Disable SSL entirely (only for local development with local DB)
  if (process.env.DB_SSL_DISABLED === "true") {
    return false;
  }

  const isProduction = process.env.NODE_ENV === "production";
  
  // In production, always verify certificates unless explicitly disabled
  // DB_SSL_REJECT_UNAUTHORIZED=false is NOT recommended for production
  const rejectUnauthorized = 
    process.env.DB_SSL_REJECT_UNAUTHORIZED === "false" ? false : isProduction;

  // For cloud database poolers (Neon, Supabase, etc.) that use different hostnames
  // Set DB_SSL_MODE=require to skip hostname verification while still validating certs
  const sslMode = process.env.DB_SSL_MODE || "verify-full";
  
  if (sslMode === "require") {
    // Validate certificate chain but skip hostname check (for poolers)
    return {
      rejectUnauthorized,
      checkServerIdentity: () => undefined,
    };
  }

  // Default: Full verification (recommended for direct connections)
  return {
    rejectUnauthorized,
  };
}

const pool = new Pool({
  connectionString,
  ssl: getSslConfig(),
  connectionTimeoutMillis: 10000, // 10s timeout - long enough for Neon cold start, short enough to not hang forever
  max: 10,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

let isInitialized = false;

// --- MOCK DATA FOR FALLBACK ---
const MOCK_USER_ID = 999;
const MOCK_USER: User = {
  id: MOCK_USER_ID,
  username: "demo_user",
  password_hash: "", // Not checked in mock mode
  // created_at is optional in User type, but good to have
};
const MOCK_PROFILE: Profile = {
  id: 1,
  user_id: MOCK_USER_ID,
  age: 26,
  weight: 75,
  height: 180,
  gender: "Prefer not to say",
  goal: "General fitness",
  level: "Regular", // Corrected from "Intermediate" to match Union Type
  tenure: "1 year",
  goal_weight: 72,
  notes: "Focus: general fitness and strength.",
  diet_type: ["No Restrictions"],
  cuisine: "No Preference",
  protein_powder: "No",
  meals_per_day: 3,
  allergies: [],
  cooking_level: "Moderate",
  budget: "Standard"
};

// In-memory mock store so local dev works even without a DB
const mockProfileStore = new Map<number, Profile>();

function allowMockAuth(): boolean {
  // Industry-ready default: NEVER allow mock authentication in production.
  // For local dev, you can explicitly enable it with ALLOW_MOCK_AUTH=true.
  return process.env.ALLOW_MOCK_AUTH === 'true';
}

export async function initializeDatabase() {
  if (isInitialized) return;

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          analytics_trial_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          age INTEGER,
          weight DECIMAL(5,2),
          height DECIMAL(5,2),
          gender VARCHAR(32),
          goal VARCHAR(32),
          level VARCHAR(50),
          tenure TEXT,
          goal_weight DECIMAL(5,2),
          notes TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Backward-compatible migrations for existing DBs
      // Analytics free-trial tracking (safe to run repeatedly)
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_trial_start TIMESTAMP;`);
      await client.query(`ALTER TABLE users ALTER COLUMN analytics_trial_start SET DEFAULT CURRENT_TIMESTAMP;`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(32);`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal VARCHAR(32);`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal VARCHAR(32);`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_weight DECIMAL(5,2);`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_duration TEXT;`);

      // Diet preference migrations
      // Convert older VARCHAR columns to arrays if they exist as single values, or create as arrays
      // We use safe conversion: If it was a string, make it an array of 1 item.

      // diet_type
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'diet_type' AND data_type = 'character varying') THEN
            ALTER TABLE profiles ALTER COLUMN diet_type TYPE TEXT[] USING CASE WHEN diet_type IS NULL THEN NULL ELSE ARRAY[diet_type]::TEXT[] END;
          ELSE
            ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diet_type TEXT[];
          END IF;
        END $$;
      `);

      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cuisine VARCHAR(50);`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protein_powder VARCHAR(10);`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protein_powder_amount INTEGER;`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meals_per_day INTEGER;`);

      // allergies -> Array
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'allergies' AND data_type = 'text') THEN
            ALTER TABLE profiles ALTER COLUMN allergies TYPE TEXT[] USING CASE WHEN allergies IS NULL THEN NULL ELSE ARRAY[allergies]::TEXT[] END;
          ELSE
            ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allergies TEXT[];
          END IF;
        END $$;
      `);

      // New columns
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cooking_level VARCHAR(50);`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS budget VARCHAR(50);`);

      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specific_food_preferences TEXT;`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);`);

      // Session duration column for workout length (in minutes)
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_duration INTEGER;`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMP NOT NULL
        );
      `);

      // Progress tracking tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS routines (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          week_number INTEGER NOT NULL,
          routine_json JSONB NOT NULL,
          week_start_date DATE,
          archived BOOLEAN NOT NULL DEFAULT FALSE,
          archived_at TIMESTAMP,
          profile_snapshot JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Backfill/migration for older DBs
      await client.query(`ALTER TABLE routines ADD COLUMN IF NOT EXISTS week_start_date DATE;`);
      await client.query(`ALTER TABLE routines ADD COLUMN IF NOT EXISTS archived BOOLEAN;`);
      await client.query(`ALTER TABLE routines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;`);
      await client.query(`ALTER TABLE routines ADD COLUMN IF NOT EXISTS profile_snapshot JSONB;`);
      await client.query(`UPDATE routines SET archived = FALSE WHERE archived IS NULL;`);
      await client.query(`ALTER TABLE routines ALTER COLUMN archived SET DEFAULT FALSE;`);
      await client.query(`ALTER TABLE routines ALTER COLUMN archived SET NOT NULL;`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_routines_user_archived ON routines (user_id, archived);`);

      // Gym equipment columns for profiles
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gym_photos JSONB;`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gym_equipment_analysis JSONB;`);

      // Body composition columns for profiles (NEW)
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_photos JSONB;`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_composition_analysis JSONB;`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS diets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          week_number INTEGER NOT NULL,
          diet_json JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Billing / subscriptions (Premium features)
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(32) NOT NULL DEFAULT 'razorpay',
          plan_id VARCHAR(64),
          subscription_id VARCHAR(64) UNIQUE NOT NULL,
          status VARCHAR(32) NOT NULL,
          current_start TIMESTAMP,
          current_end TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Coach booking (Premium feature: Personal Coach)
      // Phase 1 uses a hard-coded coach but stores booking requests in DB.
      await client.query(`
        CREATE TABLE IF NOT EXISTS coach_bookings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          coach_name TEXT NOT NULL,
          coach_phone TEXT NOT NULL,
          coach_email TEXT NOT NULL,
          user_name TEXT,
          user_email TEXT,
          user_phone TEXT,
          coach_id INTEGER,
          preferred_at TIMESTAMP,
          message TEXT,
          status VARCHAR(32) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Backward-compatible migrations
      await client.query(`ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS user_name TEXT;`);
      await client.query(`ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS user_email TEXT;`);
      await client.query(`ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS user_phone TEXT;`);
      await client.query(`ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS coach_id INTEGER;`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_coach_bookings_user_created_at ON coach_bookings (user_id, created_at DESC);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_coach_bookings_coach_created_at ON coach_bookings (coach_id, created_at DESC);`);

      // Coaches marketplace (B2B): coaches sign up as normal users, then apply and are approved by admin.
      await client.query(`
        CREATE TABLE IF NOT EXISTS coaches (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(32) NOT NULL DEFAULT 'pending',
          admin_notes TEXT,
          approved_at TIMESTAMP,
          rejected_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_coaches_status_created_at ON coaches (status, created_at DESC);`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS coach_profiles (
          id SERIAL PRIMARY KEY,
          coach_id INTEGER UNIQUE REFERENCES coaches(id) ON DELETE CASCADE,
          display_name TEXT NOT NULL,
          bio TEXT,
          experience_years INTEGER,
          certifications TEXT,
          specialties TEXT[],
          languages TEXT[],
          timezone TEXT DEFAULT 'Asia/Kolkata',
          phone TEXT,
          email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Backward-compatible migrations (safe to run repeatedly)
      await client.query(`ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS bio TEXT;`);
      await client.query(`ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;`);
      await client.query(`ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS certifications TEXT;`);
      await client.query(`ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS specialties TEXT[];`);
      await client.query(`ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS languages TEXT[];`);
      await client.query(`ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS timezone TEXT;`);
      await client.query(`ALTER TABLE coach_profiles ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';`);
      await client.query(`ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS phone TEXT;`);
      await client.query(`ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS email TEXT;`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS coach_availability_rules (
          id SERIAL PRIMARY KEY,
          coach_id INTEGER REFERENCES coaches(id) ON DELETE CASCADE,
          weekday INTEGER NOT NULL, -- 0=Mon ... 6=Sun
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          slot_minutes INTEGER NOT NULL DEFAULT 30,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_coach_avail_coach_weekday ON coach_availability_rules (coach_id, weekday);`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS exercise_completions (
          id SERIAL PRIMARY KEY,
          routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE,
          day_index INTEGER NOT NULL,
          exercise_index INTEGER NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          actual_weight DECIMAL(5,2),
          actual_reps INTEGER,
          notes TEXT,
          completed_at TIMESTAMP
        );
      `);

      // Rest-day completion tracking (day-level)
      await client.query(`
        CREATE TABLE IF NOT EXISTS day_completions (
          id SERIAL PRIMARY KEY,
          routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE,
          day_index INTEGER NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP,
          UNIQUE (routine_id, day_index)
        );
      `);

      // Helpful indexes for analytics + progress queries (safe to run repeatedly)
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_exercise_completions_routine_day ON exercise_completions (routine_id, day_index);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_exercise_completions_completed_at ON exercise_completions (completed_at);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_day_completions_completed_at ON day_completions (completed_at);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_routines_user_created_at ON routines (user_id, created_at DESC);`
      );

      // Body measurements table for weight/measurement tracking
      await client.query(`
        CREATE TABLE IF NOT EXISTS body_measurements (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
          weight DECIMAL(5,2),
          waist DECIMAL(5,1),
          chest DECIMAL(5,1),
          arms DECIMAL(5,1),
          hips DECIMAL(5,1),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements (user_id, measured_at DESC);`
      );

      // Nationality + region (for community auto-assignment)
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality VARCHAR(8);`);
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region VARCHAR(16);`);

      // ============= XP SYSTEM =============
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_xp (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          total_xp BIGINT NOT NULL DEFAULT 0,
          last_streak_date DATE,
          last_streak_value INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS xp_events (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          event_type VARCHAR(64) NOT NULL,
          points INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events (user_id, created_at DESC);`);

      // ============= COMMUNITIES =============
      await client.query(`
        CREATE TABLE IF NOT EXISTS communities (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type VARCHAR(16) NOT NULL DEFAULT 'custom',
          region VARCHAR(16),
          join_code VARCHAR(16) UNIQUE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          member_count INTEGER NOT NULL DEFAULT 0,
          member_cap INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_communities_type_region ON communities (type, region);`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_region_unique ON communities (region) WHERE type = 'worldwide';`);

      // user_id PK enforces "one community per user"
      await client.query(`
        CREATE TABLE IF NOT EXISTS community_members (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members (community_id);`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS community_leave_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
          left_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_community_leave_user ON community_leave_log (user_id, left_at DESC);`);

      // Seed worldwide regional communities (idempotent)
      await client.query(`
        INSERT INTO communities (name, description, type, region, member_cap)
        VALUES
          ('Worldwide — APAC', 'Asia-Pacific region community', 'worldwide', 'APAC', NULL),
          ('Worldwide — EMEA', 'Europe, Middle East & Africa community', 'worldwide', 'EMEA', NULL),
          ('Worldwide — NA', 'North America community', 'worldwide', 'NA', NULL),
          ('Worldwide — LATAM', 'Latin America community', 'worldwide', 'LATAM', NULL)
        ON CONFLICT DO NOTHING;
      `);

      console.log('Database initialized successfully');
      isInitialized = true;
    } finally {
      client.release();
    }
  } catch (error) {
    if (allowMockAuth()) {
      console.error('Error initializing database (continuing with mock mode):', error);
      // We set isInitialized = true so we don't keep attempting this expensive/hanging call on every single request
      isInitialized = true;
      return;
    }
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function createUser(username: string, password: string): Promise<User | null> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const encUsername = encryptDet(username);
    const result = await pool.query<User>(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, password_hash, created_at`,
      [encUsername, hashedPassword]
    );
    const row = result.rows[0];
    if (row) row.username = username; // return plaintext to caller
    return row || null;
  } catch (error: unknown) {
    const maybePgError = error as { code?: string } | null;
    if (maybePgError?.code === '23505') return null; // Username exists
    if (allowMockAuth()) {
      console.warn("createUser DB failed, using mock auth:", error);
      return { ...MOCK_USER, username };
    }
    console.error("createUser DB failed:", error);
    throw new Error("Database unavailable. Registration is disabled until DB is configured.");
  }
}

export async function authenticateUser(username: string, password: string): Promise<number | null> {
  try {
    const encUsername = encryptDet(username);
    let result = await pool.query<User>(
      'SELECT id, password_hash FROM users WHERE username = $1',
      [encUsername]
    );

    // Fallback for legacy plaintext rows — migrate them to encrypted on success
    if (result.rows.length === 0) {
      result = await pool.query<User>(
        'SELECT id, password_hash FROM users WHERE username = $1',
        [username]
      );
      if (result.rows.length > 0) {
        await pool.query('UPDATE users SET username = $1 WHERE id = $2', [encUsername, result.rows[0].id]).catch(() => {});
      }
    }

    if (result.rows.length === 0) {
      if (allowMockAuth()) {
        console.warn(`Mock Auth: User '${username}' not found, logging in as mock user`);
        return MOCK_USER_ID;
      }
      return null;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid && allowMockAuth()) {
      console.warn(`Mock Auth: Invalid password for '${username}', logging in as mock user`);
      return MOCK_USER_ID;
    }

    return isValid ? user.id : null;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("authenticateUser DB failed, using mock auth:", error);
      // Mock auth is explicitly enabled for local development
      return MOCK_USER_ID;
    }
    console.error("authenticateUser DB failed:", error);
    return null;
  }
}

export async function getUserIdByUsername(username: string): Promise<number | null> {
  try {
    const encUsername = encryptDet(username);
    const result = await pool.query<User>('SELECT id FROM users WHERE username = $1', [encUsername]);

    // Fallback for legacy plaintext rows — migrate on success
    if (!result.rows[0]) {
      const ptResult = await pool.query<User>('SELECT id FROM users WHERE username = $1', [username]);
      if (ptResult.rows[0]) {
        await pool.query('UPDATE users SET username = $1 WHERE id = $2', [encUsername, ptResult.rows[0].id]).catch(() => {});
      }
      return ptResult.rows?.[0]?.id ?? null;
    }

    return result.rows[0].id;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getUserIdByUsername DB failed, using mock auth:", error);
      return MOCK_USER_ID;
    }
    console.error("getUserIdByUsername DB failed:", error);
    return null;
  }
}

export async function getUser(userId: number): Promise<Pick<User, 'id' | 'username'> | null> {
  try {
    const result = await pool.query<User>(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );
    const row = result.rows[0] || null;
    if (row) row.username = decrypt(row.username);
    return row;
  } catch (error) {
    if (allowMockAuth()) {
      if (userId === MOCK_USER_ID) return { id: MOCK_USER_ID, username: MOCK_USER.username };
      return null;
    }
    console.error("getUser DB failed:", error);
    return null;
  }
}

export async function createUserWithRandomPassword(username: string): Promise<User | null> {
  const random = `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  return await createUser(username, random);
}

const getProfileCached = unstable_cache(
  async (userId: number) => {
    try {
      const result = await pool.query<Profile>(
        'SELECT * FROM profiles WHERE user_id = $1',
        [userId]
      );
      const profile = result.rows[0] || null;
      if (profile?.name) profile.name = decrypt(profile.name);
      return profile;
    } catch (error) {
      console.error("getProfile DB failed:", error);
      throw error;
    }
  },
  ['user-profile'],
  { tags: ['user-profile'] }
);

export async function getProfile(userId: number): Promise<Profile | null> {
  try {
    return await getProfileCached(userId);
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getProfile DB failed, using mock:", error);
      // FALLBACK PROFILE (per-user)
      return mockProfileStore.get(userId) || { ...MOCK_PROFILE, user_id: userId };
    }
    throw error;
  }
}

export async function saveProfile(
  userId: number,
  age: number,
  weight: number,
  height: number,
  gender: Profile['gender'],
  goal: Profile['goal'],
  level: string,
  tenure: string,
  goal_weight?: number,
  notes?: string,
  goal_duration?: string,
  session_duration?: number,
  diet_type?: string[],
  cuisine?: Profile['cuisine'],
  protein_powder?: 'Yes' | 'No',
  protein_powder_amount?: number,
  meals_per_day?: number,
  allergies?: string[],
  specific_food_preferences?: string,
  cooking_level?: Profile['cooking_level'],

  budget?: Profile['budget'],
  name?: string,
  gym_photos?: any,
  gym_equipment_analysis?: any,
  body_photos?: any,
  body_composition_analysis?: any
): Promise<Profile | null> {
  // Safe cast since we handle string to strict union transition
  const validLevel = level as Profile['level'];

  try {
    // Optimistic fallback first: just mock return
    const mockReturn: Profile = {
      ...MOCK_PROFILE,
      age,
      weight,
      height,
      gender,
      goal,
      level: validLevel, // Use the casted level
      tenure,
      goal_weight: typeof goal_weight === 'number' && Number.isFinite(goal_weight) ? goal_weight : undefined,
      notes: notes?.trim() ? notes.trim() : undefined,
      goal_duration: goal_duration?.trim() ? goal_duration.trim() : undefined,
      session_duration: typeof session_duration === 'number' && Number.isFinite(session_duration) ? session_duration : undefined,
      diet_type: diet_type || [],
      cuisine: cuisine,
      protein_powder,
      protein_powder_amount,
      meals_per_day,
      allergies: allergies || [],
      specific_food_preferences: specific_food_preferences?.trim() ? specific_food_preferences.trim() : undefined,
      cooking_level: cooking_level,

      budget: budget,
      name: name?.trim() ? name.trim() : undefined
    };

    // Try Real DB
    const existing = await getProfile(userId);

    // Fallback trigger if user is the mock user
    if (userId === MOCK_USER_ID && allowMockAuth()) {
      mockProfileStore.set(userId, { ...mockReturn, updated_at: new Date() });
      return mockReturn;
    }

    if (existing) {
      const result = await pool.query<Profile>(
        `UPDATE profiles 
         SET age = $2, weight = $3, height = $4, gender = $5,
             goal = $6, level = $7, tenure = $8, goal_weight = $9, notes = $10,
             goal_duration = $11, session_duration = $12,
             diet_type = $13, cuisine = $14, protein_powder = $15, meals_per_day = $16, allergies = $17,
             cooking_level = $18, budget = $19, protein_powder_amount = $20, specific_food_preferences = $21,
             name = $22, gym_photos = $23, gym_equipment_analysis = $24,
             body_photos = $25, body_composition_analysis = $26,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          age,
          weight,
          height,
          gender,
          goal,
          level,
          tenure,
          typeof goal_weight === 'number' && Number.isFinite(goal_weight) ? goal_weight : null,
          notes?.trim() ? notes.trim() : null,
          goal_duration?.trim() ? goal_duration.trim() : null,
          typeof session_duration === 'number' && Number.isFinite(session_duration) ? session_duration : null,
          diet_type || null,
          cuisine || null,
          protein_powder || null,
          meals_per_day || null,
          allergies || null,
          cooking_level || null,
          budget || null,
          protein_powder_amount || null,

          specific_food_preferences?.trim() ? specific_food_preferences.trim() : null,
          name?.trim() ? encryptRnd(name.trim()) : null,
          gym_photos || null,
          gym_equipment_analysis || null,
          body_photos || null,
          body_composition_analysis || null
        ]
      );
      revalidateTag('user-profile', undefined as any);
      return result.rows[0];
    } else {
      const result = await pool.query<Profile>(
        `INSERT INTO profiles (
           user_id, age, weight, height, gender, goal, level, tenure, goal_weight, notes, goal_duration, session_duration,
           diet_type, cuisine, protein_powder, meals_per_day, allergies, cooking_level, budget, protein_powder_amount, specific_food_preferences, name,
           gym_photos, gym_equipment_analysis, body_photos, body_composition_analysis
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
         RETURNING *`,
        [
          userId,
          age,
          weight,
          height,
          gender,
          goal,
          validLevel,
          tenure,
          typeof goal_weight === 'number' && Number.isFinite(goal_weight) ? goal_weight : null,
          notes?.trim() ? notes.trim() : null,
          goal_duration?.trim() ? goal_duration.trim() : null,
          typeof session_duration === 'number' && Number.isFinite(session_duration) ? session_duration : null,
          diet_type || null,
          cuisine || null,
          protein_powder || null,
          meals_per_day || null,
          allergies || null,
          cooking_level || null,
          budget || null,
          protein_powder_amount || null,
          specific_food_preferences?.trim() ? specific_food_preferences.trim() : null,
          name?.trim() ? encryptRnd(name.trim()) : null,
          gym_photos || null,
          gym_equipment_analysis || null,
          body_photos || null,
          body_composition_analysis || null
        ]
      );
      revalidateTag('user-profile', undefined as any);
      return result.rows[0];
    }
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("saveProfile DB failed, using mock:", error);
      // Return mock with the requested data
      const fallback: Profile = {
        ...MOCK_PROFILE,
        age,
        weight,
        height,
        gender,
        goal,
        level: validLevel,
        tenure,
        goal_weight: typeof goal_weight === 'number' && Number.isFinite(goal_weight) ? goal_weight : undefined,
        notes: notes?.trim() ? notes.trim() : undefined,
        goal_duration: goal_duration?.trim() ? goal_duration.trim() : undefined,
        session_duration: typeof session_duration === 'number' && Number.isFinite(session_duration) ? session_duration : undefined,
        diet_type,
        cuisine,
        protein_powder,
        meals_per_day,
        allergies,
        cooking_level: cooking_level,
        budget: budget
      };
      mockProfileStore.set(userId, { ...fallback, user_id: userId, updated_at: new Date() });
      return { ...fallback, user_id: userId };
    }
    console.error("saveProfile DB failed:", error);
    throw error;
  }
}

// ============= PROFILE COMPARISON HELPER =============

/**
 * Checks if there are significant changes between two profiles that would require regenerating a routine.
 * Returns true if the profiles are significantly different, false otherwise.
 */
export function hasSignificantProfileChange(oldProfile: any, newProfile: any): boolean {
  if (!oldProfile || !newProfile) return true; // If no comparison possible, assume changed

  // Check gender change (always significant)
  if (oldProfile.gender !== newProfile.gender) return true;

  // Check goal change (always significant)
  if (oldProfile.goal !== newProfile.goal) return true;

  // Check level change (always significant)
  if (oldProfile.level !== newProfile.level) return true;

  // Check age change (±1 year is significant)
  const ageDiff = Math.abs((newProfile.age || 0) - (oldProfile.age || 0));
  if (ageDiff >= 1) return true;

  // Check weight change (±3kg is significant)
  const weightDiff = Math.abs((newProfile.weight || 0) - (oldProfile.weight || 0));
  if (weightDiff >= 3) return true;

  // Check height change (±2cm is significant)
  const heightDiff = Math.abs((newProfile.height || 0) - (oldProfile.height || 0));
  if (heightDiff >= 2) return true;

  // Check goal_weight change if both are set (±3kg is significant)
  if (oldProfile.goal_weight && newProfile.goal_weight) {
    const goalWeightDiff = Math.abs(newProfile.goal_weight - oldProfile.goal_weight);
    if (goalWeightDiff >= 3) return true;
  } else if ((oldProfile.goal_weight || null) !== (newProfile.goal_weight || null)) {
    // If one was set and now isn't (or vice versa), that's significant
    return true;
  }

  // No significant changes detected
  return false;
}


// ============= ROUTINE & PROGRESS TRACKING =============

// Mock Storage
const mockRoutineStore = new Map<number, any>();
const mockDietStore = new Map<number, any>();
// Key: routineId -> Array of execution records
const mockCompletionStore = new Map<number, Map<string, boolean>>();
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

export async function getLatestRoutine(userId: number): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, week_number, routine_json, week_start_date, created_at
       FROM routines
       WHERE user_id = $1
         AND archived = FALSE
       ORDER BY week_number DESC, week_start_date DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length > 0) return result.rows[0];
    throw new Error("No DB routine found");
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getLatestRoutine DB failed/empty, checking mock:", error);
      // FALLBACK
      const userRoutines = Array.from(mockRoutineStore.values())
        .filter(r => r.user_id === userId)
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
export async function toggleExerciseCompletion(
  userId: number,
  routineId: number,
  dayIndex: number,
  exerciseIndex: number,
  completed: boolean
): Promise<boolean> {
  const key = `${dayIndex}-${exerciseIndex}`;
  try {
    // 1. Verify ownership
    const ownership = await pool.query(
      'SELECT id FROM routines WHERE id = $1 AND user_id = $2',
      [routineId, userId]
    );
    if (ownership.rows.length === 0) {
      console.warn(`User ${userId} attempted to modify routine ${routineId} which helps to someone else (or doesn't exist).`);
      return false; // Or throw an error depending on preference, but false indicates failure to toggle
    }

    // Check if completion record exists
    const existing = await pool.query(
      `SELECT id FROM exercise_completions
       WHERE routine_id = $1 AND day_index = $2 AND exercise_index = $3`,
      [routineId, dayIndex, exerciseIndex]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE exercise_completions
         SET completed = $4, completed_at = $5
         WHERE routine_id = $1 AND day_index = $2 AND exercise_index = $3`,
        [routineId, dayIndex, exerciseIndex, completed, completed ? new Date() : null]
      );
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO exercise_completions (routine_id, day_index, exercise_index, completed, completed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [routineId, dayIndex, exerciseIndex, completed, completed ? new Date() : null]
      );
    }
    return true;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("toggleExerciseCompletion DB failed, using mock:", error);
      // FALLBACK
      if (!mockCompletionStore.has(routineId)) {
        mockCompletionStore.set(routineId, new Map());
      }
      mockCompletionStore.get(routineId)?.set(key, completed);
      return true;
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
      `SELECT day_index, exercise_index, completed
       FROM exercise_completions
       WHERE routine_id = $1`,
      [routineId]
    );
    return result.rows;
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

export async function getBodyMeasurements(userId: number, limit = 90): Promise<BodyMeasurement[]> {
  try {
    // use module-level pool
    const res = await pool.query<BodyMeasurement>(
      `SELECT id, user_id, measured_at::text, weight, waist, chest, arms, hips, notes, created_at
       FROM body_measurements
       WHERE user_id = $1
       ORDER BY measured_at DESC
       LIMIT $2`,
      [userId, limit]
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

// ============= BILLING / SUBSCRIPTIONS (PREMIUM) =============

export type PremiumStatus = {
  /** Paid subscription active (or cancelled but still within current_end) */
  premium: boolean;
  /** Access to analytics (paid OR trial) */
  access: boolean;
  /** 7-day trial is currently active */
  trial_active: boolean;
  /** Trial end timestamp (if known) */
  trial_end: Date | null;
  status: string | null;
  subscription_id: string | null;
  current_end: Date | null;
};

export async function getPremiumStatus(userId: number): Promise<PremiumStatus> {
  // Check if PREMIUM environment variable is set to "true" - grants premium to everyone
  const premiumEnvEnabled = process.env.PREMIUM === "true";
  if (premiumEnvEnabled) {
    // Grant premium access to everyone when PREMIUM=true
    // Set current_end far in the future (10 years) so premium lasts as long as env var is set
    const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    return {
      premium: true,
      access: true,
      trial_active: false, // Not a trial, it's full premium
      trial_end: null,
      status: "active",
      subscription_id: "env_premium",
      current_end: farFuture,
    };
  }

  try {
    const res = await pool.query(
      `SELECT subscription_id, status, current_end
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );

    const row = res.rows?.[0] as { subscription_id?: string; status?: string; current_end?: Date | string } | undefined;
    const status = typeof row?.status === "string" ? row.status : null;
    const subscription_id = typeof row?.subscription_id === "string" ? row.subscription_id : null;
    const current_end_raw = row?.current_end ?? null;
    const current_end =
      current_end_raw instanceof Date
        ? current_end_raw
        : typeof current_end_raw === "string"
          ? new Date(current_end_raw)
          : null;

    const now = Date.now();
    const currentEndOk = current_end ? current_end.getTime() > now : false;
    const premium = status === "active" || (status === "cancelled" && currentEndOk);

    // 7-day free trial (persisted).
    // - New users: analytics_trial_start defaults to created time.
    // - Existing users: first time we check status, we set analytics_trial_start = NOW to grant a one-time 7-day trial.
    let trial_end: Date | null = null;
    let trial_active = false;
    try {
      const u = await pool.query<{ analytics_trial_start?: Date | string | null }>(
        `SELECT analytics_trial_start FROM users WHERE id = $1 LIMIT 1`,
        [userId]
      );
      let trial_start_raw = u.rows?.[0]?.analytics_trial_start ?? null;
      if (trial_start_raw == null) {
        // Initialize for existing users
        const upd = await pool.query<{ analytics_trial_start?: Date | string | null }>(
          `UPDATE users SET analytics_trial_start = CURRENT_TIMESTAMP WHERE id = $1 RETURNING analytics_trial_start`,
          [userId]
        );
        trial_start_raw = upd.rows?.[0]?.analytics_trial_start ?? null;
      }
      const trial_start =
        trial_start_raw instanceof Date
          ? trial_start_raw
          : typeof trial_start_raw === 'string'
            ? new Date(trial_start_raw)
            : null;
      if (trial_start && !Number.isNaN(trial_start.getTime())) {
        trial_end = new Date(trial_start.getTime() + 7 * 24 * 60 * 60 * 1000);
        trial_active = trial_end.getTime() > now;
      }
    } catch {
      // If we can't read/write trial_start, treat trial as inactive.
    }

    const access = premium || trial_active;

    return { premium, access, trial_active, trial_end, status, subscription_id, current_end };
  } catch (error) {
    console.error("getPremiumStatus DB failed:", error);
    return {
      premium: false,
      access: false,
      trial_active: false,
      trial_end: null,
      status: null,
      subscription_id: null,
      current_end: null,
    };
  }
}

export async function upsertSubscriptionFromRazorpay(input: {
  userId: number | null;
  provider: "razorpay";
  planId?: string | null;
  subscriptionId: string;
  status: string;
  currentStart?: number | null; // unix seconds
  currentEnd?: number | null; // unix seconds
}): Promise<void> {
  // Never try to save mock user subscriptions to the real DB
  if (input.userId === MOCK_USER_ID && allowMockAuth()) {
    console.log("Mock Mode: Skipping DB save for mock user subscription");
    return;
  }

  try {
    const start = typeof input.currentStart === "number" ? new Date(input.currentStart * 1000) : null;
    const end = typeof input.currentEnd === "number" ? new Date(input.currentEnd * 1000) : null;

    if (input.userId == null) {
      await pool.query(
        `UPDATE subscriptions
         SET status = $2, plan_id = COALESCE($3, plan_id), current_start = COALESCE($4, current_start), current_end = COALESCE($5, current_end),
             updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = $1`,
        [input.subscriptionId, input.status, input.planId ?? null, start, end]
      );
      return;
    }

    await pool.query(
      `INSERT INTO subscriptions (user_id, provider, plan_id, subscription_id, status, current_start, current_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (subscription_id) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           plan_id = COALESCE(EXCLUDED.plan_id, subscriptions.plan_id),
           status = EXCLUDED.status,
           current_start = COALESCE(EXCLUDED.current_start, subscriptions.current_start),
           current_end = COALESCE(EXCLUDED.current_end, subscriptions.current_end),
           updated_at = CURRENT_TIMESTAMP`,
      [input.userId, input.provider, input.planId ?? null, input.subscriptionId, input.status, start, end]
    );
  } catch (error) {
    console.error("upsertSubscriptionFromRazorpay DB failed:", error);
    throw error;
  }
}

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

export async function listAssignedCoachBookings(coachId: number, limit = 50): Promise<Array<{
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
  const res = await pool.query<any>(
    `SELECT id, coach_id, coach_name, status, preferred_at, message, user_name, user_email, user_phone, created_at
     FROM coach_bookings
     WHERE coach_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [cid, lim]
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

// ============= NATIONALITY / REGION =============

const COUNTRY_TO_REGION: Record<string, 'APAC' | 'EMEA' | 'NA' | 'LATAM'> = {
  // APAC
  IN: 'APAC', CN: 'APAC', JP: 'APAC', KR: 'APAC', TH: 'APAC', VN: 'APAC',
  ID: 'APAC', MY: 'APAC', SG: 'APAC', PH: 'APAC', AU: 'APAC', NZ: 'APAC',
  PK: 'APAC', BD: 'APAC', LK: 'APAC', NP: 'APAC', TW: 'APAC', HK: 'APAC',
  // NA
  US: 'NA', CA: 'NA', MX: 'NA',
  // LATAM
  BR: 'LATAM', AR: 'LATAM', CO: 'LATAM', CL: 'LATAM', PE: 'LATAM',
  VE: 'LATAM', EC: 'LATAM', UY: 'LATAM', PY: 'LATAM', BO: 'LATAM',
  // EMEA
  GB: 'EMEA', DE: 'EMEA', FR: 'EMEA', IT: 'EMEA', ES: 'EMEA', NL: 'EMEA',
  SE: 'EMEA', NO: 'EMEA', DK: 'EMEA', FI: 'EMEA', IE: 'EMEA', PT: 'EMEA',
  PL: 'EMEA', CH: 'EMEA', AT: 'EMEA', BE: 'EMEA', GR: 'EMEA', CZ: 'EMEA',
  RU: 'EMEA', UA: 'EMEA', TR: 'EMEA', SA: 'EMEA', AE: 'EMEA', IL: 'EMEA',
  EG: 'EMEA', ZA: 'EMEA', NG: 'EMEA', KE: 'EMEA', MA: 'EMEA',
};

export function countryToRegion(countryCode: string | null | undefined): 'APAC' | 'EMEA' | 'NA' | 'LATAM' | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  return COUNTRY_TO_REGION[code] ?? 'EMEA';
}

export async function saveNationality(
  userId: number,
  nationality: string | null,
  region: 'APAC' | 'EMEA' | 'NA' | 'LATAM' | null
): Promise<void> {
  if (allowMockAuth() && userId === MOCK_USER_ID) return;
  try {
    await pool.query(
      `UPDATE profiles SET nationality = $2, region = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId, nationality, region]
    );
    revalidateTag('user-profile', undefined as any);
  } catch (error) {
    console.error("saveNationality failed:", error);
  }
}

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

export async function listWorldwideCommunities(): Promise<Community[]> {
  try {
    const res = await pool.query(
      `SELECT * FROM communities WHERE type = 'worldwide' ORDER BY region ASC`
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
  limit: number = 100
): Promise<CommunityMember[]> {
  try {
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
       LIMIT $2`,
      [communityId, Math.max(1, Math.min(500, limit))]
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
