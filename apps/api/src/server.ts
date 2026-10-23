import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { log } from "@draftline/adapters";
import type { Container } from "@draftline/composition";
import { cacheControlHeader, createDraftSchema, createJobSchema, loginSchema } from "@draftline/contracts";
import { ForbiddenError, NotFoundError, UnauthorizedError, type Principal } from "@draftline/domain";
import { BadRequest, mapError } from "./http-error";

const COOKIE = "draftline_session";

type AppEnv = { Variables: { requestId: string } };

export function createServer(container: Container): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.onError((error, c) => {
    const mapped = mapError(error);
    const requestId = c.get("requestId") ?? "unknown";
    log("error", { msg: "request_failed", requestId, code: mapped.code, method: c.req.method, path: pathOf(c) });
    c.header("cache-control", "no-store");
    return c.json({ error: { code: mapped.code, message: mapped.message } }, statusCode(mapped.status));
  });

  app.use("*", async (c, next) => {
    const incoming = c.req.header("x-request-id");
    const requestId = incoming && /^[A-Za-z0-9-]{8,80}$/.test(incoming) ? incoming : crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    c.header("x-content-type-options", "nosniff");
    c.header("referrer-policy", "no-referrer");
    c.header("x-frame-options", "DENY");
    const started = Date.now();
    let failed = false;
    try {
      if (isMutation(c.req.method) && !isAllowedOrigin(c.req.header("origin"), container.env.WEB_ORIGIN)) {
        throw new ForbiddenError("Cross-origin request refused.");
      }
      await next();
      c.header("cache-control", cacheControlHeader(c.req.method, pathOf(c)));
      const cache = c.res.headers.get("cache-control");
      if (cache?.startsWith("private")) c.header("vary", "cookie");
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      if (!failed) {
        log("info", {
          msg: "request",
          requestId,
          method: c.req.method,
          path: pathOf(c),
          status: c.res.status,
          ms: Date.now() - started,
        });
      }
    }
  });

  app.get("/health", async (c) => {
    try {
      await container.ping();
    } catch (error) {
      log("error", { msg: "health_failed", err: error, requestId: c.get("requestId") });
      return c.json({ ok: false }, 503);
    }
    return c.json({ ok: true });
  });

  app.post("/sessions", async (c) => {
    const body = loginSchema.parse(await readJson(c));
    const result = await container.login(body);
    if (!result.token) {
      return c.json({ error: { code: "unauthorized", message: "Email or password is incorrect." } }, 401);
    }
    setCookie(c, COOKIE, result.token, cookieOptions(container));
    return c.json({ ok: true });
  });

  app.delete("/sessions", async (c) => {
    const token = getCookie(c, COOKIE);
    await container.logout(token);
    deleteCookie(c, COOKIE, { path: "/" });
    return c.body(null, 204);
  });

  app.get("/me", async (c) => {
    const actor = await principal(c, container);
    const account = await container.account(actor);
    return c.json(account);
  });

  app.get("/jobs", async (c) => {
    const actor = await principal(c, container);
    const jobs = await container.listJobs(actor);
    return c.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
      })),
    });
  });

  app.post("/jobs", async (c) => {
    const actor = await principal(c, container);
    const body = createJobSchema.parse(await readJson(c));
    const created = await container.enqueue(actor, body);
    return c.json(created, 201);
  });

  app.get("/jobs/:id", async (c) => {
    const actor = await principal(c, container);
    const id = parseId(c.req.param("id"));
    const { job, outputText } = await container.getJob(actor, id);
    return c.json({
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        failureCode: job.failureCode,
        prompt: job.prompt,
        outputText,
      },
    });
  });

  app.get("/drafts", async (c) => {
    const actor = await principal(c, container);
    const drafts = await container.listDrafts(actor);
    return c.json({
      drafts: drafts.map((draft) => ({
        id: draft.id,
        title: draft.title,
        updatedAt: draft.updatedAt.toISOString(),
      })),
    });
  });

  app.post("/drafts", async (c) => {
    const actor = await principal(c, container);
    const body = createDraftSchema.parse(await readJson(c));
    const created = await container.saveDraft(actor, body);
    return c.json(created, 201);
  });

  app.get("/drafts/:id", async (c) => {
    const actor = await principal(c, container);
    const id = parseId(c.req.param("id"));
    const draft = await container.getDraft(actor, id);
    return c.json({
      draft: {
        id: draft.id,
        title: draft.title,
        body: draft.body,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
      },
    });
  });

  app.post("/drafts/:id/jobs", async (c) => {
    const actor = await principal(c, container);
    const id = parseId(c.req.param("id"));
    const created = await container.enqueueFromDraft(actor, id);
    return c.json(created, 201);
  });

  app.notFound((c) => {
    c.header("cache-control", "no-store");
    return c.json({ error: { code: "not_found", message: "Not found." } }, 404);
  });

  return app;
}

function pathOf(c: Context<AppEnv>): string {
  return new URL(c.req.url).pathname;
}

function isMutation(method: string): boolean {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isAllowedOrigin(requestOrigin: string | undefined, webOrigin: string): boolean {
  if (requestOrigin === undefined || requestOrigin === webOrigin) return true;
  let requestUrl: URL;
  let allowedUrl: URL;
  try {
    requestUrl = new URL(requestOrigin);
    allowedUrl = new URL(webOrigin);
  } catch {
    return false;
  }
  if (requestUrl.protocol !== allowedUrl.protocol || requestUrl.port !== allowedUrl.port) return false;
  return LOOPBACK_HOSTS.has(loopbackHost(requestUrl)) && LOOPBACK_HOSTS.has(loopbackHost(allowedUrl));
}

function loopbackHost(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function statusCode(status: number): 400 | 401 | 403 | 404 | 413 | 415 | 500 {
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 413 || status === 415) {
    return status;
  }
  return 500;
}

async function principal(c: Context<AppEnv>, container: Container): Promise<Principal> {
  const actor = await container.authenticate(getCookie(c, COOKIE));
  if (!actor) throw new UnauthorizedError();
  return actor;
}

function parseId(value: string | undefined): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

async function readJson(c: Context<AppEnv>): Promise<unknown> {
  const contentType = c.req.header("content-type");
  if (!contentType || !contentType.toLowerCase().includes("application/json")) {
    throw new BadRequest(415, "unsupported_media", "Content-Type must be application/json.");
  }
  const text = await c.req.text();
  if (text.length > 100_000) throw new BadRequest(413, "payload_too_large", "Request body is too large.");
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) throw new BadRequest(400, "invalid_json", "Request body must be JSON.");
    throw error;
  }
}

function cookieOptions(container: Container): {
  httpOnly: true;
  sameSite: "Lax";
  path: "/";
  secure: boolean;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: container.env.WEB_ORIGIN.startsWith("https://"),
    maxAge: Math.floor(container.env.SESSION_TTL_MS / 1000),
  };
}
