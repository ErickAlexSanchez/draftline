import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadRootEnv(): void {
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      const file = path.join(dir, ".env");
      if (!existsSync(file)) return;
      for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
      }
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

loadRootEnv();

function readApiUrl(): string | undefined {
  const value = process.env.API_URL;
  if (typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))) {
    return value;
  }
  return undefined;
}

const apiUrl = readApiUrl();
if (process.env.VERCEL !== "1" && apiUrl === undefined) {
  throw new Error("Invalid environment: API_URL");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    if (apiUrl === undefined) {
      return [];
    }
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
