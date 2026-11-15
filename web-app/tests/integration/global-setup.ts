import { Client } from "pg";

// Wipes the test database once per run. initializeDatabase() then rebuilds the
// schema on first use, so the schema DDL itself is exercised by every run.
export default async function setup() {
  const url = process.env.TEST_POSTGRES_URL || "postgres://gym:gym@127.0.0.1:54329/gym_test";
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to reset "${dbName}": integration tests only run against a *_test database.`);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `Cannot reach the test database at ${url.replace(/:[^:@/]+@/, ":***@")}. ` +
        `Start it with "npm run db:up". (${(err as Error).message})`,
    );
  }
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();
}
