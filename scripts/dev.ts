import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadRootEnv } from "../packages/adapters/src/load-env";
import { ensurePostgres } from "./postgres-local";

const root = loadRootEnv();
process.env.NEXT_TELEMETRY_DISABLED = "1";

const children: ChildProcess[] = [];
let shuttingDown = false;

function start(args: string[], cwd: string): void {
  const child = spawn(process.execPath, args, { cwd, env: process.env, stdio: "inherit" });
  children.push(child);
  child.on("exit", (code) => {
    if (shuttingDown) return;
    shutdown(code ?? 1);
  });
}

function shutdown(code: number): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 400);
}

const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const nextCandidates = [
  path.join(root, "node_modules", "next", "dist", "bin", "next"),
  path.join(root, "apps", "web", "node_modules", "next", "dist", "bin", "next"),
];
const foundNext = nextCandidates.find((candidate) => existsSync(candidate));
if (!foundNext) throw new Error("Could not find the Next.js binary");
const nextBin: string = foundNext;

async function main(): Promise<void> {
  await ensurePostgres();
  start([tsx, path.join("apps", "api", "src", "main.ts")], root);
  start([tsx, path.join("apps", "worker", "src", "main.ts")], root);
  start([nextBin, "dev", "--port", "3201", "--hostname", "127.0.0.1"], path.join(root, "apps", "web"));
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "dev failed";
  console.error(JSON.stringify({ level: "error", msg: "dev_failed", detail: message }));
  shutdown(1);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
