import { readdir, readFile, rm } from "node:fs/promises";
import type { ModelGateway } from "@draftline/domain";
import { compose, type Container } from "@draftline/composition";
import { createServer } from "../../apps/api/src/server";
import { listen } from "../../apps/api/src/listen";
import {
  DEMO_TENANT_ID,
  PgBudget,
  createPool,
  ensureDatabase,
  resetWorkspace,
  seed,
  setTenantCredits,
} from "@draftline/postgres";

class RecordingModelGateway implements ModelGateway {
  calls = 0;

  async generate(_input: { prompt: string }): Promise<{ text: string }> {
    this.calls += 1;
    return { text: "Recorded draft body." };
  }
}

const editorEmail = "editor@draftline.example";
const viewerEmail = "viewer@draftline.example";
const editorPassword = "editor-test-password";
const viewerPassword = "viewer-test-password";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

async function emptyDir(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir);
    await Promise.all(entries.map(async (name) => rm(`${dir}/${name}`, { force: true })));
  } catch (error) {
    if (isEnoent(error)) return;
    throw error;
  }
}

async function readObject(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object");
  return body as Record<string, unknown>;
}

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string") throw new Error(`Missing ${key}`);
  return value;
}

describe("job generation invariant", () => {
  jest.setTimeout(30_000);
  const model = new RecordingModelGateway();
  let container: Container;
  let baseUrl = "";
  let closeServer: () => Promise<void> = async () => undefined;
  const databaseUrl = required("DATABASE_URL");
  const storageDir = required("STORAGE_DIR");
  const admin = createPool(databaseUrl);

  beforeAll(async () => {
    await ensureDatabase(databaseUrl);
    container = await compose({ model });
    const server = await listen(createServer(container), 0);
    baseUrl = `http://127.0.0.1:${server.port}`;
    closeServer = server.close;
    await seed(admin, {
      editorEmail,
      viewerEmail,
      editorPassword,
      viewerPassword,
    });
  }, 60_000);

  beforeEach(async () => {
    model.calls = 0;
    await resetWorkspace(admin);
    await emptyDir(storageDir);
  });

  afterAll(async () => {
    await closeServer();
    await container.close();
    await admin.end();
  });

  async function login(email: string, password: string): Promise<string> {
    const response = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(response.status).toBe(200);
    const cookie = response.headers.getSetCookie()[0]?.split(";")[0];
    if (!cookie) throw new Error("Login did not set a session cookie");
    return cookie;
  }

  async function enqueue(cookie: string): Promise<string> {
    const response = await fetch(`${baseUrl}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        title: "Harbor notes",
        prompt: "Write a short welcome for the harbor newsletter.",
      }),
    });
    const body = await readObject(response);
    expect(response.status).toBe(201);
    expect(body.status).toBe("queued");
    return readString(body, "id");
  }

  it("POST /jobs persists queued and does not invoke ModelGateway", async () => {
    const cookie = await login(editorEmail, editorPassword);
    const id = await enqueue(cookie);
    expect(model.calls).toBe(0);
    const row = await admin.query("SELECT status FROM jobs WHERE id = $1", [id]);
    expect(row.rows[0]?.status).toBe("queued");
    const files = await readdir(storageDir).catch((error: unknown) => {
      if (isEnoent(error)) return [];
      throw error;
    });
    expect(files).toEqual([]);
  });

  it("the worker invokes the model, stores the draft, and debits credits with the success", async () => {
    const cookie = await login(editorEmail, editorPassword);
    const id = await enqueue(cookie);
    expect(model.calls).toBe(0);
    const outcome = await container.processNextJob();
    expect(outcome).toBe("processed");
    expect(model.calls).toBe(1);
    const stored = await readFile(`${storageDir}/${id}.txt`, "utf8");
    expect(stored).toBe("Recorded draft body.");
    const row = await admin.query("SELECT status, object_key FROM jobs WHERE id = $1", [id]);
    expect(row.rows[0]?.status).toBe("succeeded");
    expect(row.rows[0]?.object_key).toBe(`${id}.txt`);
    const credits = await admin.query("SELECT credits FROM tenants WHERE id = $1", [DEMO_TENANT_ID]);
    expect(credits.rows[0]?.credits).toBe(19);
    const detail = await fetch(`${baseUrl}/jobs/${id}`, { headers: { cookie } });
    expect(detail.headers.get("cache-control")).toBe("no-store");
    const payload = await readObject(detail);
    const job = payload.job;
    if (typeof job !== "object" || job === null) throw new Error("missing job");
    expect((job as Record<string, unknown>).outputText).toBe("Recorded draft body.");
  });

  it("zero credits fails the job without calling the model or writing a file", async () => {
    await setTenantCredits(admin, DEMO_TENANT_ID, 0);
    const cookie = await login(editorEmail, editorPassword);
    const id = await enqueue(cookie);
    expect(model.calls).toBe(0);
    await container.processNextJob();
    expect(model.calls).toBe(0);
    const files = await readdir(storageDir).catch((error: unknown) => {
      if (isEnoent(error)) return [];
      throw error;
    });
    expect(files).toEqual([]);
    const row = await admin.query("SELECT status, failure_code, object_key FROM jobs WHERE id = $1", [id]);
    expect(row.rows[0]?.status).toBe("failed");
    expect(row.rows[0]?.failure_code).toBe("insufficient_credits");
    expect(row.rows[0]?.object_key).toBeNull();
    const credits = await admin.query("SELECT credits FROM tenants WHERE id = $1", [DEMO_TENANT_ID]);
    expect(credits.rows[0]?.credits).toBe(0);
  });

  it("returns 403 when a viewer enqueues and does not insert a job", async () => {
    const cookie = await login(viewerEmail, viewerPassword);
    const response = await fetch(`${baseUrl}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title: "Nope", prompt: "A viewer cannot enqueue this." }),
    });
    expect(response.status).toBe(403);
    expect(model.calls).toBe(0);
    const count = await admin.query("SELECT count(*)::int AS count FROM jobs");
    expect(count.rows[0]?.count).toBe(0);
    const list = await fetch(`${baseUrl}/jobs`, { headers: { cookie } });
    expect(list.status).toBe(200);
  });

  it("caches lists and saved drafts, and does not cache generation", async () => {
    const cookie = await login(editorEmail, editorPassword);
    const jobs = await fetch(`${baseUrl}/jobs`, { headers: { cookie } });
    const drafts = await fetch(`${baseUrl}/drafts`, { headers: { cookie } });
    expect(jobs.headers.get("cache-control")).toBe("private, max-age=60");
    expect(drafts.headers.get("cache-control")).toBe("private, max-age=60");
    expect(jobs.headers.get("vary")?.toLowerCase()).toContain("cookie");
    const created = await fetch(`${baseUrl}/drafts`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title: "Saved brief", body: "A neighborhood note." }),
    });
    expect(created.status).toBe(201);
    const draftId = readString(await readObject(created), "id");
    const draft = await fetch(`${baseUrl}/drafts/${draftId}`, { headers: { cookie } });
    expect(draft.status).toBe(200);
    expect(draft.headers.get("cache-control")).toBe("private, max-age=60");
    const id = await enqueue(cookie);
    const detail = await fetch(`${baseUrl}/jobs/${id}`, { headers: { cookie } });
    expect(detail.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects anonymous reads and cross-origin writes", async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    const anonymous = await fetch(`${baseUrl}/jobs`);
    expect(anonymous.status).toBe(401);
    const response = await fetch(`${baseUrl}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ title: "Nope", prompt: "Cross origin." }),
    });
    expect(response.status).toBe(403);
    expect(model.calls).toBe(0);
  });

  it("rolls back a credit debit when the job is not running", async () => {
    const cookie = await login(editorEmail, editorPassword);
    const id = await enqueue(cookie);
    const budget = new PgBudget(admin);
    await expect(
      budget.commitSuccess({
        tenantId: DEMO_TENANT_ID,
        jobId: id,
        cost: 1,
        objectKey: `${id}.txt`,
        now: new Date(),
      }),
    ).rejects.toThrow("Job was not running");
    const credits = await admin.query("SELECT credits FROM tenants WHERE id = $1", [DEMO_TENANT_ID]);
    expect(credits.rows[0]?.credits).toBe(20);
    const row = await admin.query("SELECT status FROM jobs WHERE id = $1", [id]);
    expect(row.rows[0]?.status).toBe("queued");
    expect(model.calls).toBe(0);
  });
});
