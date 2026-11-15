// Creates web-app/.env.local for local development against docker-compose
// Postgres. Never overwrites an existing .env.local.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, ".env.local");

if (existsSync(target)) {
  console.log(".env.local already exists — leaving it unchanged.");
  process.exit(0);
}

const local = {
  JWT_SECRET: randomBytes(32).toString("hex"),
  POSTGRES_URL: "postgres://gym:gym@127.0.0.1:54329/gym",
  DATABASE_DRIVER: "pg",
  DB_SSL_DISABLED: "true",
};

const lines = readFileSync(path.join(root, ".env.example"), "utf8")
  .split("\n")
  .map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    return m && m[1] in local ? `${m[1]}=${local[m[1]]}` : line;
  });

writeFileSync(target, lines.join("\n"), { mode: 0o600 });
console.log("Created .env.local for local Docker Postgres (random JWT_SECRET).");
