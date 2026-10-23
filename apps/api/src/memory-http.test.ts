import { accountSchema, jobDetailSchema, jobListSchema } from "@draftline/contracts";
import type { ModelGateway } from "@draftline/domain";
import { handleMemoryRequest, handleWorkspaceRequest } from "./workspace-handler";

const origin = "http://127.0.0.1:3201";
const touched = [
  "FAKE_MODEL_DELAY_MS",
  "JOB_VISIBILITY_DELAY_MS",
  "MODEL_CREDIT_COST",
  "SESSION_SECRET",
  "WEB_ORIGIN",
  "VERCEL",
  "API_URL",
  "DATABASE_URL",
  "SEED_EDITOR_PASSWORD",
  "SEED_VIEWER_PASSWORD",
] as const;

function applyCookies(jar: Map<string, string>, response: Response): void {
  for (const header of response.headers.getSetCookie()) {
    const parts = header.split(";").map((part) => part.trim());
    const pair = parts[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (parts.some((part) => part.toLowerCase() === "max-age=0")) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function recordingModel(): ModelGateway & { calls: number } {
  return {
    calls: 0,
    async generate(input) {
      this.calls += 1;
      return { text: `${input.prompt.trim()}\n\nReview it before you share it.` };
    },
  };
}

describe("hosted memory API", () => {
  let saved = new Map<string, string | undefined>();

  beforeEach(() => {
    saved = new Map(touched.map((key) => [key, process.env[key]]));
    process.env.FAKE_MODEL_DELAY_MS = "0";
    process.env.JOB_VISIBILITY_DELAY_MS = "2000";
    process.env.MODEL_CREDIT_COST = "1";
    process.env.SESSION_SECRET = "replace-with-a-random-string-at-least-32-chars";
    process.env.WEB_ORIGIN = origin;
    process.env.SEED_EDITOR_PASSWORD = "not-the-demo-password";
    process.env.SEED_VIEWER_PASSWORD = "not-the-demo-password";
    delete process.env.VERCEL;
    delete process.env.API_URL;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    for (const key of touched) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  async function call(
    jar: Map<string, string>,
    method: string,
    path: string,
    body?: unknown,
    extra?: { origin?: string; url?: string; headers?: Record<string, string>; model?: ModelGateway; clock?: { now(): Date } },
  ): Promise<Response> {
    const page = extra?.origin ?? origin;
    const response = await handleMemoryRequest(
      new Request(extra?.url ?? `${page}${path}`, {
        method,
        headers: {
          origin: page,
          cookie: cookieHeader(jar),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...extra?.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      { model: extra?.model, clock: extra?.clock },
    );
    applyCookies(jar, response);
    return response;
  }

  it("POST /jobs does not call the model, and a later read finishes the job", async () => {
    const model = recordingModel();
    let nowMs = Date.parse("2026-01-01T00:00:00.000Z");
    const clock = { now: () => new Date(nowMs) };
    const jar = new Map<string, string>();
    const options = { model, clock };

    const health = await call(jar, "GET", "/api/health");
    expect(health.status).toBe(200);

    const anonymous = await call(new Map(), "GET", "/api/jobs");
    expect(anonymous.status).toBe(401);

    const login = await call(jar, "POST", "/api/sessions", {
      email: "editor@draftline.example",
      password: "editor-local-pass",
    }, options);
    expect(login.status).toBe(200);
    expect(jar.get("draftline_session")).toBeTruthy();

    const account = accountSchema.parse(await (await call(jar, "GET", "/api/me", undefined, options)).json());
    expect(account.credits).toBe(20);
    expect(account.role).toBe("editor");

    const createdResponse = await call(
      jar,
      "POST",
      "/api/jobs",
      { title: "Harbor notes", prompt: "Write a short welcome for the harbor newsletter." },
      options,
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as { id: string; status: string };
    expect(created.status).toBe("queued");
    expect(model.calls).toBe(0);

    const early = jobDetailSchema.parse(await (await call(jar, "GET", `/api/jobs/${created.id}`, undefined, options)).json());
    expect(early.job.status).toBe("queued");
    expect(model.calls).toBe(0);
    expect(early.job.outputText).toBeNull();

    nowMs += 2000;
    const detailResponse = await call(jar, "GET", `/api/jobs/${created.id}`, undefined, options);
    expect(detailResponse.headers.get("cache-control")).toBe("no-store");
    const detail = jobDetailSchema.parse(await detailResponse.json());
    expect(detail.job.status).toBe("succeeded");
    expect(detail.job.outputText).toContain("Review it before you share it.");
    expect(model.calls).toBe(1);

    const listResponse = await call(jar, "GET", "/api/jobs", undefined, options);
    expect(listResponse.headers.get("cache-control")).toBe("private, max-age=60");
    const list = jobListSchema.parse(await listResponse.json());
    expect(list.jobs[0]?.status).toBe("succeeded");

    const after = accountSchema.parse(await (await call(jar, "GET", "/api/me", undefined, options)).json());
    expect(after.credits).toBe(19);

    const signedOut = await call(jar, "DELETE", "/api/sessions", undefined, options);
    expect(signedOut.status).toBe(204);
    const viewerLogin = await call(
      jar,
      "POST",
      "/api/sessions",
      { email: "viewer@draftline.example", password: "viewer-local-pass" },
      options,
    );
    expect(viewerLogin.status).toBe(200);
    const forbidden = await call(jar, "POST", "/api/jobs", { title: "Nope", prompt: "A viewer cannot enqueue this." }, options);
    expect(forbidden.status).toBe(403);
    expect(model.calls).toBe(1);
    const shared = jobListSchema.parse(await (await call(jar, "GET", "/api/jobs", undefined, options)).json());
    expect(shared.jobs).toHaveLength(1);
  });

  it("returns 403 for a cross-origin write and does not call the model", async () => {
    const model = recordingModel();
    const jar = new Map<string, string>();
    const response = await call(jar, "POST", "/api/jobs", { title: "Nope", prompt: "Cross origin." }, {
      model,
      origin: "https://evil.example",
      url: `${origin}/api/jobs`,
    });
    expect(response.status).toBe(403);
    expect(model.calls).toBe(0);
  });

  it("accepts the deployment host and ignores a spoofed forwarded host off Vercel", async () => {
    const hosted = "https://web-xi-nine-93.vercel.app";
    process.env.VERCEL = "1";
    const hostedJar = new Map<string, string>();
    const hostedLogin = await call(
      hostedJar,
      "POST",
      "/api/sessions",
      { email: "editor@draftline.example", password: "editor-local-pass" },
      {
        url: "http://localhost:3000/api/sessions",
        origin: hosted,
        headers: { "x-forwarded-host": "web-xi-nine-93.vercel.app", "x-forwarded-proto": "https" },
      },
    );
    expect(hostedLogin.status).toBe(200);
    expect(hostedLogin.headers.getSetCookie().some((cookie) => cookie.includes("Secure"))).toBe(true);

    const preview = await call(new Map(), "POST", "/api/sessions", {
      email: "viewer@draftline.example",
      password: "viewer-local-pass",
    }, {
      url: "http://localhost:3000/api/sessions",
      origin: "https://preview.example",
      headers: { "x-forwarded-host": "preview.example", "x-forwarded-proto": "https" },
    });
    expect(preview.status).toBe(200);

    delete process.env.VERCEL;
    const spoofed = await call(new Map(), "POST", "/api/jobs", { title: "Nope", prompt: "Spoofed host." }, {
      origin: "https://evil.example",
      url: `${origin}/api/jobs`,
      headers: { "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" },
    });
    expect(spoofed.status).toBe(403);
  });

  it("serves the memory catalog from the workspace handler when DATABASE_URL is unset", async () => {
    const response = await handleWorkspaceRequest(
      new Request(`${origin}/api/sessions`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({ email: "editor@draftline.example", password: "editor-local-pass" }),
      }),
    );
    expect(response.status).toBe(200);
  });
});
