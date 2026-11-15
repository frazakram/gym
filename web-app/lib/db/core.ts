// Connection pool, mock mode and schema initialization.
import { Pool as NeonPool } from '@neondatabase/serverless';
import { createRequire } from 'module';
import { User, Profile } from '@/types';
import { applySchemaIfOutdated } from '@/lib/db-schema';

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

// Production uses Neon's WebSocket driver. Local Docker Postgres and the
// integration tests can't speak that protocol, so DATABASE_DRIVER=pg opts into
// node-postgres (which Neon's Pool is API-compatible with). node-postgres is
// required only in that mode, so production cold starts never load it.
function selectPoolClass(): typeof NeonPool {
  if (process.env.DATABASE_DRIVER !== 'pg') return NeonPool;
  const loadModule = createRequire(import.meta.url);
  return (loadModule('pg') as typeof import('pg')).Pool as unknown as typeof NeonPool;
}

const Pool = selectPoolClass();

export const pool = new Pool({
  connectionString,
  ssl: getSslConfig(),
  connectionTimeoutMillis: 10000, // 10s timeout - long enough for Neon cold start, short enough to not hang forever
  max: 10,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

let isInitialized = false;

// --- MOCK DATA FOR FALLBACK ---
export const MOCK_USER_ID = 999;

export const MOCK_USER: User = {
  id: MOCK_USER_ID,
  username: "demo_user",
  password_hash: "", // Not checked in mock mode
  // created_at is optional in User type, but good to have
};

export const MOCK_PROFILE: Profile = {
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
export const mockProfileStore = new Map<number, Profile>();

export function allowMockAuth(): boolean {
  // Mock mode accepts any password and fakes DB results, so it is hard-disabled in
  // production even if ALLOW_MOCK_AUTH=true leaks into the environment. For local
  // dev without a database, enable it explicitly with ALLOW_MOCK_AUTH=true.
  return process.env.ALLOW_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production';
}

export async function initializeDatabase() {
  if (isInitialized) return;

  try {
    const client = await pool.connect();
    try {
      await applySchemaIfOutdated(client);

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
