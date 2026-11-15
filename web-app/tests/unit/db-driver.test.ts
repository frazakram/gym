import { afterEach, describe, expect, it, vi } from "vitest";

// Any attempt to load node-postgres through the module graph fails this test.
vi.mock("pg", () => {
  throw new Error("node-postgres was loaded");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("lib/db driver selection", () => {
  it("does not load node-postgres in production mode (DATABASE_DRIVER unset)", async () => {
    vi.stubEnv("DATABASE_DRIVER", "");
    const db = await import("@/lib/db");
    expect(typeof db.initializeDatabase).toBe("function");
  });
});
