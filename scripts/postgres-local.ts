import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { findRepoRoot } from "../packages/adapters/src/load-env";

const port = 5433;

function portOpen(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    let settled = false;
    const done = (open: boolean): void => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(800);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function waitForPort(): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    if (await portOpen()) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export async function ensurePostgres(): Promise<void> {
  if (await portOpen()) return;
  const root = findRepoRoot();
  const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const child = spawn(process.execPath, [tsx, path.join(root, "scripts", "postgres-host.ts")], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  if (await waitForPort()) return;
  let detail = "timed out";
  try {
    const text = readFileSync(path.join(root, "var", "pg-host.log"), "utf8");
    const last = text.trim().split(/\r?\n/).pop();
    if (last && !last.toLowerCase().includes("password")) detail = last;
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  throw new Error(`Postgres did not listen on ${port}. ${detail}`);
}
