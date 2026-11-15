import path from "node:path";
import { defineConfig } from "vitest/config";

// Integration tests: real route handlers against a real Postgres.
//   npm run db:up && npm run test:integration
// CI provides Postgres as a service and sets TEST_POSTGRES_URL.
const TEST_DB_URL = process.env.TEST_POSTGRES_URL || "postgres://gym:gym@127.0.0.1:54329/gym_test";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // One shared database: run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      // Vercel runs Node in UTC; TIMESTAMP (no tz) columns are only read correctly when Node and Postgres agree.
      TZ: "UTC",
      DATABASE_DRIVER: "pg",
      POSTGRES_URL: TEST_DB_URL,
      DATABASE_URL: "",
      DB_SSL_DISABLED: "true",
      JWT_SECRET: "integration-test-jwt-secret",
      CSRF_SECRET: "",
      ALLOW_MOCK_AUTH: "",
      PREMIUM: "",
      DB_ENCRYPTION_KEY: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      RAZORPAY_WEBHOOK_SECRET: "integration-webhook-secret",
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      YOUTUBE_API_KEY: "",
      ADMIN_USER_IDS: "",
      ADMIN_USER_ID: "",
      ADMIN_USERNAMES: "",
    },
  },
});
