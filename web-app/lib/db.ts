import { Pool } from 'pg';
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
  },
});

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
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

      console.log('Database initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    if (allowMockAuth()) {
      console.error('Error initializing database (continuing with mock mode):', error);
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
  budget?: Profile['budget']
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
      budget: budget
    };

    // Try Real DB
    const existing = await getProfile(userId);

    // Fallback trigger if user is the mock user
    if (userId === MOCK_USER_ID) {
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
          specific_food_preferences?.trim() ? specific_food_preferences.trim() : null
        ]
      );
      revalidateTag('user-profile', undefined as any);
      return result.rows[0];
    } else {
      const result = await pool.query<Profile>(
        `INSERT INTO profiles (
           user_id, age, weight, height, gender, goal, level, tenure, goal_weight, notes, goal_duration,
           diet_type, cuisine, protein_powder, meals_per_day, allergies, cooking_level, budget, protein_powder_amount, specific_food_preferences
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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

