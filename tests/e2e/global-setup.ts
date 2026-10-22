import { execFileSync } from "node:child_process";
import path from "node:path";
import { loadRootEnv } from "../../packages/adapters/src/load-env";
import { ensurePostgres } from "../../scripts/postgres-local";

const root = loadRootEnv();
const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const cli = path.join(root, "packages", "postgres", "src", "cli.ts");

function run(command: string): void {
  execFileSync(process.execPath, [tsx, cli, command], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}

export default async function globalSetup(): Promise<void> {
  await ensurePostgres();
  run("migrate");
  run("seed");
  run("reset");
}
