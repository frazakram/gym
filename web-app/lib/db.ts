import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { User, Profile } from '@/types';
import { unstable_cache, revalidateTag } from 'next/cache';

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

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined, // Bypass identity check for aliases
  },
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

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

      // Helpful indexes for analytics + progress queries (safe to run repeatedly)
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_exercise_completions_routine_day ON exercise_completions (routine_id, day_index);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_exercise_completions_completed_at ON exercise_completions (completed_at);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_routines_user_created_at ON routines (user_id, created_at DESC);`
      );

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
    const result = await pool.query<User>(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, password_hash, created_at`,
      [username, hashedPassword]
    );
    return result.rows[0] || null;
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
    const result = await pool.query<User>(
      'SELECT id, password_hash FROM users WHERE username = $1',
      [username]
    );

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
    const result = await pool.query<User>('SELECT id FROM users WHERE username = $1', [username]);
    return result.rows?.[0]?.id ?? null;
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
    return result.rows[0] || null;
  } catch (error) {
    if (allowMockAuth()) {
      // Mock fallback
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
      return result.rows[0] || null;
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
  diet_type?: string[],
  cuisine?: Profile['cuisine'],
  protein_powder?: 'Yes' | 'No',
  protein_powder_amount?: number,
  meals_per_day?: number,
  allergies?: string[],
  specific_food_preferences?: string,
  cooking_level?: Profile['cooking_level'],

  budget?: Profile['budget'],
  name?: string
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
             goal_duration = $11, 
             diet_type = $12, cuisine = $13, protein_powder = $14, meals_per_day = $15, allergies = $16,
             cooking_level = $17, budget = $18, protein_powder_amount = $19, specific_food_preferences = $20,
             name = $21,
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
          diet_type || null,
          cuisine || null,
          protein_powder || null,
          meals_per_day || null,
          allergies || null,
          cooking_level || null,
          budget || null,
          protein_powder_amount || null,

          specific_food_preferences?.trim() ? specific_food_preferences.trim() : null,
          name?.trim() ? name.trim() : null
        ]
      );
      revalidateTag('user-profile', undefined as any);
      return result.rows[0];
    } else {
      const result = await pool.query<Profile>(
        `INSERT INTO profiles (
           user_id, age, weight, height, gender, goal, level, tenure, goal_weight, notes, goal_duration,
           diet_type, cuisine, protein_powder, meals_per_day, allergies, cooking_level, budget, protein_powder_amount, specific_food_preferences, name
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
          diet_type || null,
          cuisine || null,
          protein_powder || null,
          meals_per_day || null,
          allergies || null,
          cooking_level || null,
          budget || null,
          protein_powder_amount || null,
          specific_food_preferences?.trim() ? specific_food_preferences.trim() : null
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

// ============= ROUTINE & PROGRESS TRACKING =============

// Mock Storage
const mockRoutineStore = new Map<number, any>();
const mockDietStore = new Map<number, any>();
// Key: routineId -> Array of execution records
const mockCompletionStore = new Map<number, Map<string, boolean>>();

export async function saveRoutine(
  userId: number,
  weekNumber: number,
  routine: any
): Promise<number | null> {
  try {
    const result = await pool.query(
      `INSERT INTO routines (user_id, week_number, routine_json)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, weekNumber, JSON.stringify(routine)]
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
      `SELECT id, user_id, week_number, routine_json, created_at
       FROM routines
       WHERE user_id = $1
       ORDER BY week_number DESC, created_at DESC
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

export async function getRoutinesByUser(userId: number): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, week_number, routine_json, created_at
       FROM routines
       WHERE user_id = $1
       ORDER BY week_number DESC, created_at DESC`,
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
      `SELECT id, user_id, week_number, routine_json, created_at
       FROM routines
       WHERE user_id = $1 AND week_number = $2
       ORDER BY created_at DESC
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
      trends: { daily, weekly },
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

    const sessions = sessionsRes.rows
      .map((s) => ({
        routine_id: Number(s.routine_id),
        day_index: Number(s.day_index),
        workout_at: s.workout_at instanceof Date ? s.workout_at : new Date(String(s.workout_at)),
      }))
      .filter((s) => Number.isFinite(s.routine_id) && Number.isFinite(s.day_index) && !Number.isNaN(s.workout_at.getTime()));

    const routineIds = Array.from(new Set(sessions.map((s) => s.routine_id)));
    if (routineIds.length === 0) {
      const calendar = Array.from({ length: rangeDays }, (_, i) => {
        const d = new Date(now.getTime() - (rangeDays - 1 - i) * 86400000);
        return { date: toYmdUTC(d), workouts: 0, completion_percentage: null };
      });
      return {
        range_days: rangeDays,
        generated_at: now.toISOString(),
        trends: { daily: [], weekly: [] },
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
    const workoutSessions: AnalyticsPayload["workout_history"] = sessions
      .map((s) => {
        const routine = routineById.get(s.routine_id);
        const days = routine?.routine_json?.days;
        const dayObj = Array.isArray(days) ? days[s.day_index] : null;
        const exercises = dayObj?.exercises;
        const total = Array.isArray(exercises) ? exercises.length : 0;
        const key = `${s.routine_id}:${s.day_index}`;
        const completed = completedCountByKey.get(key) ?? 0;
        const pct = total > 0 ? (completed / total) * 100 : 0;
        return {
          workout_at: s.workout_at.toISOString(),
          date: toYmdUTC(s.workout_at),
          routine_id: s.routine_id,
          week_number: routine?.week_number ?? null,
          day_index: s.day_index,
          day_name: typeof dayObj?.day === "string" ? dayObj.day : `Day ${s.day_index + 1}`,
          completed_exercises: Math.min(completed, total || completed),
          total_exercises: total,
          completion_percentage: clampPct(pct),
        };
      })
      // Only keep sessions where we can compute a total exercise count
      .filter((w) => w.total_exercises > 0)
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

    const uniqueDatesDesc = [...new Set(workoutSessions.map((w) => w.date))].sort((a, b) => (a < b ? 1 : -1));
    const streak = computeStreak(uniqueDatesDesc);

    return {
      range_days: rangeDays,
      generated_at: now.toISOString(),
      trends: { daily, weekly },
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
      trends: { daily: [], weekly: [] },
      streak: { current: 0, longest: 0, last_workout_date: null },
      calendar,
      workout_history: [],
    };
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
