import path from "node:path";
import { loadRootEnv, readRuntimeEnv, readSeedEnv } from "@draftline/adapters";
import { createPool } from "./pool";
import { migrate } from "./migrate";
import { resetWorkspace, seed } from "./seed";

async function main(): Promise<void> {
  const root = loadRootEnv();
  const command = process.argv[2];
  if (command === "migrate") {
    const env = readRuntimeEnv(process.env);
    const pool = createPool(env.DATABASE_URL);
    try {
      await migrate(pool);
    } finally {
      await pool.end();
    }
    return;
  }
  if (command === "seed") {
    const env = readSeedEnv(process.env);
    const pool = createPool(env.DATABASE_URL);
    try {
      await migrate(pool);
      await seed(pool, {
        editorEmail: env.SEED_EDITOR_EMAIL,
        viewerEmail: env.SEED_VIEWER_EMAIL,
        editorPassword: env.SEED_EDITOR_PASSWORD,
        viewerPassword: env.SEED_VIEWER_PASSWORD,
      });
    } finally {
      await pool.end();
    }
    return;
  }
  if (command === "reset") {
    const env = readRuntimeEnv(process.env);
    const pool = createPool(env.DATABASE_URL);
    try {
      await resetWorkspace(pool);
    } finally {
      await pool.end();
    }
    return;
  }
  throw new Error(`Usage: ${path.basename(root)} cli.ts migrate|seed|reset`);
}

main().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : "";
  const safe = message.startsWith("Invalid environment") || message.startsWith("Usage") ? message : undefined;
  console.error(JSON.stringify({ level: "error", msg: "command_failed", name, ...(safe ? { detail: safe } : {}) }));
  process.exit(1);
});
