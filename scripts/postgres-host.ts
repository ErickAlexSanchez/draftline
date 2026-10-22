import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { findRepoRoot } from "../packages/adapters/src/load-env";

const port = 5433;
const user = "draftline";
const password = "draftline";
const root = findRepoRoot();
const dataDir = path.join(root, "var", "pg");
const logFile = path.join(root, "var", "pg-host.log");

function note(msg: string): void {
  mkdirSync(path.dirname(logFile), { recursive: true });
  const line = JSON.stringify({ level: "info", time: new Date().toISOString(), msg: msg.split(password).join("[redacted]") });
  appendFileSync(logFile, `${line}\n`);
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

const cluster = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
  authMethod: "scram-sha-256",
  onLog: () => undefined,
  onError: () => undefined,
});

async function createAppDatabase(): Promise<void> {
  try {
    await cluster.createDatabase(user);
    return;
  } catch (error) {
    if (errorCode(error) === "42P04") return;
    if (errorCode(error) !== "3D000") throw error;
  }
  const client = cluster.getPgClient("template1");
  await client.connect();
  try {
    await client.query("CREATE DATABASE draftline");
  } catch (error) {
    if (errorCode(error) !== "42P04") throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    note("postgres_init");
    await cluster.initialise();
  }
  note("postgres_start");
  await cluster.start();
  await createAppDatabase();
  note("postgres_ready");
  await new Promise(() => undefined);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "postgres host failed";
  note(`postgres_failed ${message}`);
  process.exit(1);
});
