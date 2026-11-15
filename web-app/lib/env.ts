/**
 * Server configuration checks, run once at startup (instrumentation.ts).
 *
 * Errors are reserved for configuration the app cannot work without at all;
 * everything merely risky is a warning, so a wrong rule here can never take a
 * working deployment down for a non-fatal reason.
 */

type Env = Record<string, string | undefined>;

export type EnvCheckResult = { errors: string[]; warnings: string[] };

// Same names, in the same order, as lib/db/core.ts resolves the connection.
const DATABASE_URL_VARIABLES = [
  "POSTGRES_URL",
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_PRISMA_URL",
  "gym_POSTGRES_URL",
  "gym_DATABASE_URL",
  "gym_POSTGRES_URL_NON_POOLING",
  "gym_DATABASE_URL_UNPOOLED",
  "gym_POSTGRES_PRISMA_URL",
];

const isSet = (value: string | undefined): value is string => typeof value === "string" && value.trim() !== "";

function isPostgresUrl(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://");
}

/** Pure: inspects the given environment and reports problems. */
export function checkServerEnv(env: Env): EnvCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = env.NODE_ENV === "production";
  const mockAuthEnabled = env.ALLOW_MOCK_AUTH === "true";

  if (!isSet(env.JWT_SECRET)) {
    errors.push("JWT_SECRET is not set: sessions cannot be issued or verified.");
  }

  const hasDatabaseUrl = DATABASE_URL_VARIABLES.some((name) => isSet(env[name]) && isPostgresUrl(env[name]!));
  if (!hasDatabaseUrl && !(mockAuthEnabled && !isProduction)) {
    errors.push(`No Postgres database URL is set (one of ${DATABASE_URL_VARIABLES.slice(0, 2).join(", ")}, ...).`);
  }

  if (isSet(env.DB_ENCRYPTION_KEY) && !/^[0-9a-fA-F]{64}$/.test(env.DB_ENCRYPTION_KEY.trim())) {
    errors.push("DB_ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes).");
  }

  if (isSet(env.DATABASE_DRIVER) && env.DATABASE_DRIVER !== "pg") {
    warnings.push(`DATABASE_DRIVER="${env.DATABASE_DRIVER}" is not recognised; the Neon driver is used (only "pg" switches).`);
  }

  if (isProduction) {
    if (!isSet(env.UPSTASH_REDIS_REST_URL) || !isSet(env.UPSTASH_REDIS_REST_TOKEN)) {
      warnings.push("UPSTASH_REDIS_REST_URL/TOKEN not set: paid AI features return 503 and rate limits are off.");
    }
    if (env.PREMIUM === "true") {
      warnings.push("PREMIUM=true grants premium to every user.");
    }
    if (mockAuthEnabled) {
      warnings.push("ALLOW_MOCK_AUTH=true is ignored in production; remove it.");
    }
    const razorpay = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_PLAN_ID_ANALYTICS_MONTHLY", "RAZORPAY_WEBHOOK_SECRET"];
    const razorpaySet = razorpay.filter((name) => isSet(env[name]));
    if (razorpaySet.length > 0 && razorpaySet.length < razorpay.length) {
      warnings.push(`RAZORPAY configuration is incomplete; missing ${razorpay.filter((n) => !isSet(env[n])).join(", ")}.`);
    }
    const smtp = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
    const smtpSet = smtp.filter((name) => isSet(env[name]));
    if (smtpSet.length > 0 && smtpSet.length < smtp.length) {
      warnings.push(`SMTP configuration is incomplete; missing ${smtp.filter((n) => !isSet(env[n])).join(", ")}.`);
    }
  }

  return { errors, warnings };
}

/**
 * Logs warnings and throws on errors. Called once per server instance before
 * it serves requests; throwing makes a misconfigured deployment fail visibly at
 * startup instead of on the first request that needs the missing setting.
 */
export function assertServerEnv(env: Env = process.env): void {
  const { errors, warnings } = checkServerEnv(env);
  for (const warning of warnings) console.warn(`[config] ${warning}`);
  if (errors.length > 0) {
    throw new Error(`Invalid server configuration:\n- ${errors.join("\n- ")}`);
  }
}
