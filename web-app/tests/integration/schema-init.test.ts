import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

// Every SQL statement sent through node-postgres during a callback.
async function captureQueries(run: () => Promise<unknown>): Promise<string[]> {
  const originalQuery = Client.prototype.query;
  const issued: string[] = [];
  const spy = vi.spyOn(Client.prototype, "query").mockImplementation(function (this: Client, ...args: unknown[]) {
    const [config] = args;
    issued.push(typeof config === "string" ? config : String((config as { text?: string })?.text ?? ""));
    return (originalQuery as (...callArgs: unknown[]) => unknown).apply(this, args);
  } as typeof Client.prototype.query);
  try {
    await run();
  } finally {
    spy.mockRestore();
  }
  return issued;
}

const isDdl = (sql: string) => /^\s*(CREATE|ALTER|DROP|DO)\b/i.test(sql);

/** A fresh copy of lib/db, as on a new serverless instance (cold start). */
async function coldStartDb() {
  vi.resetModules();
  return import("@/lib/db");
}

async function withAdminClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("initializeDatabase schema handling", () => {
  it("does not run any DDL on a cold start once the schema is current", async () => {
    await (await coldStartDb()).initializeDatabase();

    const db = await coldStartDb();
    const issued = await captureQueries(() => db.initializeDatabase());

    expect(issued.filter(isDdl)).toEqual([]);
    expect(issued.length).toBeLessThanOrEqual(1);
  });

  it("builds the schema on an empty database and records its version", async () => {
    await withAdminClient((client) => client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"));
    const { SCHEMA_HASH } = await import("@/lib/db-schema");

    await (await coldStartDb()).initializeDatabase();

    const { tables, hash } = await withAdminClient(async (client) => ({
      tables: Number((await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")).rows[0].count),
      hash: (await client.query("SELECT hash FROM app_schema_version WHERE id = 1")).rows[0]?.hash,
    }));
    expect(tables).toBe(21); // 20 application tables + app_schema_version
    expect(hash).toBe(SCHEMA_HASH);
  });

  it("re-applies the schema when the recorded version is stale", async () => {
    await (await coldStartDb()).initializeDatabase();
    await withAdminClient((client) => client.query("UPDATE app_schema_version SET hash = 'stale' WHERE id = 1"));
    const { SCHEMA_HASH, SCHEMA_STATEMENTS } = await import("@/lib/db-schema");

    const db = await coldStartDb();
    const issued = await captureQueries(() => db.initializeDatabase());

    expect(issued.filter((sql) => SCHEMA_STATEMENTS.includes(sql))).toHaveLength(SCHEMA_STATEMENTS.length);
    const hash = await withAdminClient(async (client) => (await client.query("SELECT hash FROM app_schema_version WHERE id = 1")).rows[0].hash);
    expect(hash).toBe(SCHEMA_HASH);
  });

  it("applies a pending schema change only once across concurrent cold starts", async () => {
    await (await coldStartDb()).initializeDatabase();
    await withAdminClient((client) => client.query("UPDATE app_schema_version SET hash = 'stale' WHERE id = 1"));
    const { SCHEMA_STATEMENTS } = await import("@/lib/db-schema");

    const firstInstance = await coldStartDb();
    const secondInstance = await coldStartDb();
    const issued = await captureQueries(() =>
      Promise.all([firstInstance.initializeDatabase(), secondInstance.initializeDatabase()]),
    );

    expect(issued.filter((sql) => SCHEMA_STATEMENTS.includes(sql))).toHaveLength(SCHEMA_STATEMENTS.length);
  });
});
