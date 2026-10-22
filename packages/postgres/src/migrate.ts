import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool, PoolClient } from "pg";
import { findRepoRoot } from "@draftline/adapters";

const LOCK_KEY = 840021;

export function migrationsDir(): string {
  return path.join(findRepoRoot(), "packages", "postgres", "migrations");
}

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  let migrationError: unknown;
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await applyMigrations(client, migrationsDir());
  } catch (error) {
    migrationError = error;
  }
  let unlockError: unknown;
  try {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
  } catch (error) {
    unlockError = error;
  }
  client.release();
  if (migrationError) throw migrationError;
  if (unlockError) throw unlockError;
}

async function applyMigrations(client: PoolClient, directory: string): Promise<void> {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL
    )`,
  );
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    const existing = await client.query("SELECT 1 FROM schema_migrations WHERE id = $1", [file]);
    if (existing.rowCount !== 0) continue;
    const sql = await readFile(path.join(directory, file), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW())", [file]);
      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new Error("Migration rollback failed", { cause: rollbackError });
      }
      throw error;
    }
  }
}
