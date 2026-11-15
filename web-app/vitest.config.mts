import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the `@/*` path alias from tsconfig.json.
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    // Tests must never reach real services: unset anything that would.
    env: {
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      YOUTUBE_API_KEY: "",
      DB_ENCRYPTION_KEY: "",
      JWT_SECRET: "test-jwt-secret-not-for-production",
      CSRF_SECRET: "",
    },
    restoreMocks: true,
  },
});
