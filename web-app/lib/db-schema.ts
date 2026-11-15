import { createHash } from "crypto";

/**
 * Database schema, applied by initializeDatabase() (lib/db.ts).
 *
 * Statements must stay idempotent (IF NOT EXISTS / guarded DO blocks): they run
 * against databases at any earlier schema state. To change the schema, append or
 * edit statements here; SCHEMA_HASH changes automatically and every instance
 * re-applies the list once (see applySchemaIfOutdated). Never edit the database
 * by hand.
 */
export const SCHEMA_STATEMENTS: readonly string[] = [
  `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          analytics_trial_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
  `
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
      `,
  // Backward-compatible migrations for existing DBs
  // Analytics free-trial tracking (safe to run repeatedly)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_trial_start TIMESTAMP;`,
  `ALTER TABLE users ALTER COLUMN analytics_trial_start SET DEFAULT CURRENT_TIMESTAMP;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(32);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal VARCHAR(32);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal VARCHAR(32);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_weight DECIMAL(5,2);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_duration TEXT;`,
  // Diet preference migrations
  // Convert older VARCHAR columns to arrays if they exist as single values, or create as arrays
  // We use safe conversion: If it was a string, make it an array of 1 item.
  // diet_type
  `
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'diet_type' AND data_type = 'character varying') THEN
            ALTER TABLE profiles ALTER COLUMN diet_type TYPE TEXT[] USING CASE WHEN diet_type IS NULL THEN NULL ELSE ARRAY[diet_type]::TEXT[] END;
          ELSE
            ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diet_type TEXT[];
          END IF;
        END $$;
      `,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cuisine VARCHAR(50);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protein_powder VARCHAR(10);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protein_powder_amount INTEGER;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meals_per_day INTEGER;`,
  // allergies -> Array
  `
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'allergies' AND data_type = 'text') THEN
            ALTER TABLE profiles ALTER COLUMN allergies TYPE TEXT[] USING CASE WHEN allergies IS NULL THEN NULL ELSE ARRAY[allergies]::TEXT[] END;
          ELSE
            ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allergies TEXT[];
          END IF;
        END $$;
      `,
  // New columns
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cooking_level VARCHAR(50);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS budget VARCHAR(50);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specific_food_preferences TEXT;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);`,
  // Session duration column for workout length (in minutes)
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_duration INTEGER;`,
  `
        CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMP NOT NULL
        );
      `,
  // Progress tracking tables
  `
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
      `,
  // Backfill/migration for older DBs
  `ALTER TABLE routines ADD COLUMN IF NOT EXISTS week_start_date DATE;`,
  `ALTER TABLE routines ADD COLUMN IF NOT EXISTS archived BOOLEAN;`,
  `ALTER TABLE routines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;`,
  `ALTER TABLE routines ADD COLUMN IF NOT EXISTS profile_snapshot JSONB;`,
  `UPDATE routines SET archived = FALSE WHERE archived IS NULL;`,
  `ALTER TABLE routines ALTER COLUMN archived SET DEFAULT FALSE;`,
  `ALTER TABLE routines ALTER COLUMN archived SET NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_routines_user_archived ON routines (user_id, archived);`,
  // Gym equipment columns for profiles
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gym_photos JSONB;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gym_equipment_analysis JSONB;`,
  // Body composition columns for profiles (NEW)
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_photos JSONB;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_composition_analysis JSONB;`,
  `
        CREATE TABLE IF NOT EXISTS diets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          week_number INTEGER NOT NULL,
          diet_json JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
  // Billing / subscriptions (Premium features)
  `
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
      `,
  // Coach booking (Premium feature: Personal Coach)
  // Phase 1 uses a hard-coded coach but stores booking requests in DB.
  `
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
      `,
  // Backward-compatible migrations
  `ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS user_name TEXT;`,
  `ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS user_email TEXT;`,
  `ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS user_phone TEXT;`,
  `ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS coach_id INTEGER;`,
  `CREATE INDEX IF NOT EXISTS idx_coach_bookings_user_created_at ON coach_bookings (user_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_coach_bookings_coach_created_at ON coach_bookings (coach_id, created_at DESC);`,
  // Coaches marketplace (B2B): coaches sign up as normal users, then apply and are approved by admin.
  `
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
      `,
  `CREATE INDEX IF NOT EXISTS idx_coaches_status_created_at ON coaches (status, created_at DESC);`,
  `
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
      `,
  // Backward-compatible migrations (safe to run repeatedly)
  `ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS bio TEXT;`,
  `ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;`,
  `ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS certifications TEXT;`,
  `ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS specialties TEXT[];`,
  `ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS languages TEXT[];`,
  `ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS timezone TEXT;`,
  `ALTER TABLE coach_profiles ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';`,
  `ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS phone TEXT;`,
  `ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS email TEXT;`,
  `
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
      `,
  `CREATE INDEX IF NOT EXISTS idx_coach_avail_coach_weekday ON coach_availability_rules (coach_id, weekday);`,
  `
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
      `,
  // Rest-day completion tracking (day-level)
  `
        CREATE TABLE IF NOT EXISTS day_completions (
          id SERIAL PRIMARY KEY,
          routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE,
          day_index INTEGER NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP,
          UNIQUE (routine_id, day_index)
        );
      `,
  // Helpful indexes for analytics + progress queries (safe to run repeatedly)
  `CREATE INDEX IF NOT EXISTS idx_exercise_completions_routine_day ON exercise_completions (routine_id, day_index);`,
  `CREATE INDEX IF NOT EXISTS idx_exercise_completions_completed_at ON exercise_completions (completed_at);`,
  `CREATE INDEX IF NOT EXISTS idx_day_completions_completed_at ON day_completions (completed_at);`,
  `CREATE INDEX IF NOT EXISTS idx_routines_user_created_at ON routines (user_id, created_at DESC);`,
  // Body measurements table for weight/measurement tracking
  `
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
      `,
  `CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements (user_id, measured_at DESC);`,
  // Nationality + region (for community auto-assignment)
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality VARCHAR(8);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region VARCHAR(16);`,
  // Preferred rest days (user-configurable, max 2)
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_rest_days TEXT[];`,
  // Selected gym columns (gym selection + equipment auto-detection)
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_gym_name TEXT;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_gym_place_id TEXT;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_gym_image_url TEXT;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_gym_equipment JSONB;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_gym_location TEXT;`,
  // ============= NUTRITION TRACKING (Cal AI-style food log) =============
  // Daily macro/calorie targets live on the profile, next to the TDEE
  // inputs (age/weight/height/gender/goal) they're derived from.
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_calorie_goal INTEGER;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protein_goal_g INTEGER;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS carb_goal_g INTEGER;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fat_goal_g INTEGER;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_type VARCHAR(32);`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_level VARCHAR(32);`,
  `
        CREATE TABLE IF NOT EXISTS food_entries (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
          source VARCHAR(16) NOT NULL DEFAULT 'manual',
          name TEXT NOT NULL,
          calories DECIMAL(8,2) NOT NULL DEFAULT 0,
          protein_g DECIMAL(8,2) NOT NULL DEFAULT 0,
          carb_g DECIMAL(8,2) NOT NULL DEFAULT 0,
          fat_g DECIMAL(8,2) NOT NULL DEFAULT 0,
          quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
          unit VARCHAR(32) NOT NULL DEFAULT 'serving',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
  `CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries (user_id, entry_date DESC);`,
  `
        CREATE TABLE IF NOT EXISTS favorite_foods (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          source VARCHAR(16) NOT NULL DEFAULT 'manual',
          calories DECIMAL(8,2) NOT NULL DEFAULT 0,
          protein_g DECIMAL(8,2) NOT NULL DEFAULT 0,
          carb_g DECIMAL(8,2) NOT NULL DEFAULT 0,
          fat_g DECIMAL(8,2) NOT NULL DEFAULT 0,
          quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
          unit VARCHAR(32) NOT NULL DEFAULT 'serving',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, name, quantity, unit)
        );
      `,
  `CREATE INDEX IF NOT EXISTS idx_favorite_foods_user ON favorite_foods (user_id, created_at DESC);`,
  // ============= XP SYSTEM =============
  `
        CREATE TABLE IF NOT EXISTS user_xp (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          total_xp BIGINT NOT NULL DEFAULT 0,
          last_streak_date DATE,
          last_streak_value INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
  `
        CREATE TABLE IF NOT EXISTS xp_events (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          event_type VARCHAR(64) NOT NULL,
          points INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
  `CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events (user_id, created_at DESC);`,
  // ============= COMMUNITIES =============
  `
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
      `,
  `CREATE INDEX IF NOT EXISTS idx_communities_type_region ON communities (type, region);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_region_unique ON communities (region) WHERE type = 'worldwide';`,
  // user_id PK enforces "one community per user"
  `
        CREATE TABLE IF NOT EXISTS community_members (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
  `CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members (community_id);`,
  `
        CREATE TABLE IF NOT EXISTS community_leave_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
          left_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
  `CREATE INDEX IF NOT EXISTS idx_community_leave_user ON community_leave_log (user_id, left_at DESC);`,
  // Seed worldwide regional communities (idempotent)
  `
        INSERT INTO communities (name, description, type, region, member_cap)
        VALUES
          ('Worldwide — APAC', 'Asia-Pacific region community', 'worldwide', 'APAC', NULL),
          ('Worldwide — EMEA', 'Europe, Middle East & Africa community', 'worldwide', 'EMEA', NULL),
          ('Worldwide — NA', 'North America community', 'worldwide', 'NA', NULL),
          ('Worldwide — LATAM', 'Latin America community', 'worldwide', 'LATAM', NULL)
        ON CONFLICT DO NOTHING;
      `,
  // Razorpay webhook safety: ids of processed events (idempotent redelivery), and
  // the creation time of the last applied event so late deliveries can't regress state.
  `CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
     event_id TEXT PRIMARY KEY,
     event TEXT NOT NULL,
     subscription_id TEXT,
     processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ`,
];

/** Fingerprint of the schema definition; stored in app_schema_version. */
export const SCHEMA_HASH = createHash("sha256").update(SCHEMA_STATEMENTS.join("\n;\n")).digest("hex");

// Arbitrary constant identifying the schema-migration advisory lock.
const SCHEMA_LOCK_KEY = 482_917_311;

/** Minimal client surface shared by node-postgres and Neon serverless clients. */
export type SchemaClient = {
  query(text: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
};

async function readAppliedSchemaHash(client: SchemaClient): Promise<string | null> {
  try {
    const result = await client.query("SELECT hash FROM app_schema_version WHERE id = 1");
    const hash = result.rows[0]?.hash;
    return typeof hash === "string" ? hash : null;
  } catch (error) {
    // 42P01 = undefined_table: a database that predates schema versioning.
    if ((error as { code?: string }).code === "42P01") return null;
    throw error;
  }
}

/**
 * Applies SCHEMA_STATEMENTS unless the database already records SCHEMA_HASH.
 *
 * Fast path (every cold start once current): a single SELECT, no DDL, no locks.
 * Slow path (first run after a schema change): one transaction holding a
 * transaction-scoped advisory lock, so concurrent cold starts apply it once and
 * the change is all-or-nothing. Transaction-scoped locks are safe behind
 * transaction-mode poolers (PgBouncer / Neon pooled endpoints), unlike
 * session-level locks.
 */
export async function applySchemaIfOutdated(client: SchemaClient): Promise<"up-to-date" | "applied"> {
  if ((await readAppliedSchemaHash(client)) === SCHEMA_HASH) return "up-to-date";

  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout = '15s'");
    await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK_KEY]);
    // Created before the re-check: inside a transaction, querying a missing table
    // would abort the whole transaction.
    await client.query(
      `CREATE TABLE IF NOT EXISTS app_schema_version (
         id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
         hash TEXT NOT NULL,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    // Another instance may have applied it while we waited for the lock.
    if ((await readAppliedSchemaHash(client)) === SCHEMA_HASH) {
      await client.query("COMMIT");
      return "up-to-date";
    }
    for (const statement of SCHEMA_STATEMENTS) {
      await client.query(statement);
    }
    await client.query(
      `INSERT INTO app_schema_version (id, hash) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET hash = EXCLUDED.hash, applied_at = now()`,
      [SCHEMA_HASH],
    );
    await client.query("COMMIT");
    return "applied";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
