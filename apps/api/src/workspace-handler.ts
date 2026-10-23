import { randomUUID } from "node:crypto";
import { hasDatabaseUrl, log, packSnapshot, readDemoEnv, unpackSnapshot, type MemorySnapshot } from "@draftline/adapters";
import { createMemoryContainer, openDemoWorkspace } from "@draftline/composition/memory";
import type { Clock, ModelGateway, ObjectStorage } from "@draftline/domain";
import { backendTarget, toBackendRequest } from "./backend-request";
import { createServer } from "./server";
import { readBrowserId, readWorkspaceChunks, workspaceCookies } from "./workspace-cookie";

const JOB_PATH = /^\/jobs\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MemoryOverrides = {
  model?: ModelGateway;
  storage?: ObjectStorage;
  clock?: Clock;
};

type Lane = {
  pending: number;
  tail: Promise<void>;
  latest: MemorySnapshot | null;
};

const lanes = new Map<string, Lane>();

function shouldDrive(method: string, pathname: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  return pathname === "/jobs" || JOB_PATH.test(pathname);
}

function readHttpUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return undefined;
}

async function withLane<T>(
  browserId: string,
  incoming: MemorySnapshot | null,
  run: (snapshot: MemorySnapshot | null) => Promise<{ snapshot: MemorySnapshot; result: T }>,
): Promise<T> {
  let lane = lanes.get(browserId);
  if (!lane) {
    lane = { pending: 0, tail: Promise.resolve(), latest: null };
    lanes.set(browserId, lane);
    if (lanes.size > 200) {
      for (const [key, value] of lanes) {
        if (value.pending === 0 && key !== browserId) {
          lanes.delete(key);
          break;
        }
      }
    }
  }
  const join = lane.pending > 0;
  lane.pending += 1;
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = lane.tail;
  lane.tail = previous.then(
    () => gate,
    () => gate,
  );
  await previous;
  try {
    const started = join && lane.latest ? lane.latest : incoming;
    const outcome = await run(started);
    lane.latest = outcome.snapshot;
    return outcome.result;
  } finally {
    lane.pending -= 1;
    if (lane.pending === 0) lane.latest = null;
    release();
  }
}

function withExtraCookies(response: Response, extra: readonly string[]): Response {
  if (extra.length === 0) return response;
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    headers.append(key, value);
  });
  for (const current of response.headers.getSetCookie()) headers.append("set-cookie", current);
  for (const current of extra) headers.append("set-cookie", current);
  const body = response.status === 204 ? null : response.body;
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export async function handleMemoryRequest(request: Request, overrides: MemoryOverrides = {}): Promise<Response> {
  const env = readDemoEnv(process.env);
  const cookieHeader = request.headers.get("cookie");
  const existingId = readBrowserId(cookieHeader);
  const browserId = existingId ?? randomUUID();
  const packed = readWorkspaceChunks(cookieHeader);
  const incoming = unpackSnapshot(packed.chunks, env.SESSION_SECRET);
  return withLane(browserId, incoming, async (snapshot) => {
    const workspace = await openDemoWorkspace(snapshot);
    const before = JSON.stringify(workspace.snapshot());
    const container = createMemoryContainer(workspace, env, overrides);
    const target = backendTarget(request);
    if (shouldDrive(request.method, target.pathname)) await container.processNextJob();
    const response = await createServer(container).fetch(await toBackendRequest(request, target));
    const after = workspace.snapshot();
    const changed = JSON.stringify(after) !== before;
    let chunks: string[] | null = null;
    if (changed) {
      try {
        chunks = packSnapshot(after, env.SESSION_SECRET);
      } catch (error) {
        log("error", { msg: "workspace_snapshot_failed", err: error });
      }
    }
    const extra = workspaceCookies({
      browserId,
      setBrowserId: existingId === undefined,
      chunks,
      previousNames: packed.names,
      secure: target.protocol === "https:",
      maxAge: Math.floor(env.SESSION_TTL_MS / 1000),
    });
    return { snapshot: after, result: withExtraCookies(response, extra) };
  });
}

async function proxyApi(request: Request, apiUrl: string): Promise<Response> {
  const incoming = new URL(request.url);
  const pathname = incoming.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const target = new URL(`${pathname}${incoming.search}`, apiUrl);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  return fetch(target, { method: request.method, headers, body, redirect: "manual" });
}

export async function handleWorkspaceRequest(request: Request): Promise<Response> {
  const apiUrl = readHttpUrl(process.env.API_URL);
  if (apiUrl) return proxyApi(request, apiUrl);
  if (hasDatabaseUrl(process.env)) {
    const { handlePostgresRequest } = await import("./postgres-handler");
    return handlePostgresRequest(request);
  }
  return handleMemoryRequest(request);
}
