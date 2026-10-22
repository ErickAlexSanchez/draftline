import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { loadRootEnv } from "../packages/adapters/src/load-env";

const root = loadRootEnv();
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.env.JOB_VISIBILITY_DELAY_MS = "2000";
process.env.FAKE_MODEL_DELAY_MS = "400";
process.env.JOB_POLL_MS = "200";
process.env.API_PORT = "3202";
process.env.WEB_ORIGIN = "http://localhost:3201";
process.env.API_URL = "http://127.0.0.1:3202";

const storage = path.isAbsolute(process.env.STORAGE_DIR ?? "")
  ? (process.env.STORAGE_DIR ?? path.join(root, "var", "storage"))
  : path.join(root, process.env.STORAGE_DIR ?? path.join("var", "storage"));
rmSync(storage, { recursive: true, force: true });

const children: ChildProcess[] = [];
let shuttingDown = false;

function start(args: string[], cwd: string): ChildProcess {
  const child = spawn(process.execPath, args, { cwd, env: process.env, stdio: "inherit" });
  children.push(child);
  child.on("exit", (code) => {
    if (shuttingDown) return;
    shutdown(code ?? 1);
  });
  return child;
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

async function waitFor(url: string): Promise<void> {
  const started = Date.now();
  let last = "not-ready";
  while (Date.now() - started < 90_000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      last = String(response.status);
    } catch (error) {
      last = error instanceof Error ? error.name : "error";
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${url}: ${last}`);
}

const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const nextCandidates = [
  path.join(root, "node_modules", "next", "dist", "bin", "next"),
  path.join(root, "apps", "web", "node_modules", "next", "dist", "bin", "next"),
];
const foundNext = nextCandidates.find((candidate) => existsSync(candidate));
if (!foundNext) throw new Error("Could not find the Next.js binary");
const nextBin: string = foundNext;

function stayAlive(): Promise<void> {
  return new Promise(() => undefined);
}

async function main(): Promise<void> {
  start([tsx, path.join("apps", "api", "src", "main.ts")], root);
  start([tsx, path.join("apps", "worker", "src", "main.ts")], root);
  await waitFor("http://127.0.0.1:3202/health");
  start([nextBin, "dev", "--port", "3201", "--hostname", "127.0.0.1"], path.join(root, "apps", "web"));
  await stayAlive();
}

void main().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "Error";
  console.error(JSON.stringify({ level: "error", msg: "e2e_host_failed", name }));
  shutdown(1);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
