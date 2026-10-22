import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  DiskObjectStorage,
  FakeModelGateway,
  findRepoRoot,
  loadRootEnv,
  log,
  readRuntimeEnv,
  scryptHasher,
  systemClock,
  createTokenIssuer,
  type RuntimeEnv,
} from "@draftline/adapters";
import {
  authenticate,
  completeClaimedJob,
  enqueueJob,
  enqueueJobFromDraft,
  getDraft,
  getJob,
  listDrafts,
  listJobs,
  loginUser,
  saveDraft,
  type Clock,
  type ModelGateway,
  type ObjectStorage,
  type Principal,
} from "@draftline/domain";
import {
  createPool,
  migrate,
  PgBudget,
  PgDrafts,
  PgJobs,
  PgSessions,
  PgTenants,
  PgUsers,
} from "@draftline/postgres";

export type ComposeOverrides = {
  model?: ModelGateway;
  storage?: ObjectStorage;
  clock?: Clock;
};

export type Container = {
  env: RuntimeEnv;
  ping(): Promise<void>;
  close(): Promise<void>;
  login(input: { email: string; password: string }): Promise<{ token: string } | { token: null }>;
  logout(token: string | undefined): Promise<void>;
  authenticate(token: string | undefined): Promise<Principal | null>;
  account(actor: Principal): Promise<{ email: string; role: Principal["role"]; tenantName: string; credits: number }>;
  listJobs(actor: Principal): ReturnType<typeof listJobs>;
  getJob(actor: Principal, id: string): Promise<{ job: Awaited<ReturnType<typeof getJob>>; outputText: string | null }>;
  enqueue(
    actor: Principal,
    input: { title: string; prompt: string; draftId?: string | null },
  ): ReturnType<typeof enqueueJob>;
  listDrafts(actor: Principal): ReturnType<typeof listDrafts>;
  getDraft(actor: Principal, id: string): ReturnType<typeof getDraft>;
  saveDraft(actor: Principal, input: { title: string; body: string }): ReturnType<typeof saveDraft>;
  enqueueFromDraft(actor: Principal, draftId: string): ReturnType<typeof enqueueJobFromDraft>;
  processNextJob(): Promise<"idle" | "processed">;
};

export async function compose(overrides: ComposeOverrides = {}): Promise<Container> {
  const root = loadRootEnv();
  const env = readRuntimeEnv(process.env);
  const pool = createPool(env.DATABASE_URL);
  await migrate(pool);
  const storageDir = path.isAbsolute(env.STORAGE_DIR) ? env.STORAGE_DIR : path.join(root, env.STORAGE_DIR);
  const storage = overrides.storage ?? new DiskObjectStorage(storageDir);
  const model = overrides.model ?? new FakeModelGateway(env.FAKE_MODEL_DELAY_MS);
  const clock = overrides.clock ?? systemClock;
  const jobs = new PgJobs(pool);
  const drafts = new PgDrafts(pool);
  const users = new PgUsers(pool);
  const sessions = new PgSessions(pool);
  const tenants = new PgTenants(pool);
  const budget = new PgBudget(pool);
  const tokens = createTokenIssuer(env.SESSION_SECRET);
  const ids = { next: () => randomUUID() };
  if (findRepoRoot() !== root) throw new Error("Composition root mismatch");

  return {
    env,
    async ping() {
      await pool.query("SELECT 1");
    },
    async close() {
      await pool.end();
    },
    login(input) {
      return loginUser(
        { users, sessions, passwords: scryptHasher, tokens, clock, ids, sessionTtlMs: env.SESSION_TTL_MS },
        input,
      );
    },
    async logout(token) {
      if (!token) return;
      await sessions.deleteByTokenHash(tokens.hash(token));
    },
    authenticate(token) {
      return authenticate(sessions, tokens, token, clock.now());
    },
    async account(actor) {
      const tenant = await tenants.findById(actor.tenantId);
      if (!tenant) throw new Error("Tenant not found");
      return { email: actor.email, role: actor.role, tenantName: tenant.name, credits: tenant.credits };
    },
    listJobs(actor) {
      return listJobs(jobs, actor);
    },
    async getJob(actor, id) {
      const job = await getJob(jobs, actor, id);
      const outputText = job.objectKey ? await storage.get(job.objectKey) : null;
      return { job, outputText };
    },
    enqueue(actor, input) {
      return enqueueJob({ jobs, drafts, clock, ids, creditCost: env.MODEL_CREDIT_COST }, actor, input);
    },
    listDrafts(actor) {
      return listDrafts(drafts, actor);
    },
    getDraft(actor, id) {
      return getDraft(drafts, actor, id);
    },
    saveDraft(actor, input) {
      return saveDraft({ drafts, clock, ids }, actor, input);
    },
    enqueueFromDraft(actor, draftId) {
      return enqueueJobFromDraft({ jobs, drafts, clock, ids, creditCost: env.MODEL_CREDIT_COST }, actor, draftId);
    },
    async processNextJob() {
      const now = clock.now();
      const visibleBefore = new Date(now.getTime() - env.JOB_VISIBILITY_DELAY_MS);
      const claimed = await jobs.claimNext(visibleBefore, now);
      if (!claimed) return "idle";
      try {
        const outcome = await completeClaimedJob({ jobs, budget, model, storage, clock }, claimed);
        log("info", { msg: "job_finished", jobId: claimed.id, outcome });
        return "processed";
      } catch (error) {
        log("error", { msg: "job_failed", jobId: claimed.id, err: error });
        try {
          await jobs.markFailed(claimed.id, "worker_error", clock.now());
        } catch (markError) {
          log("error", { msg: "job_mark_failed", jobId: claimed.id, err: markError });
        }
        return "processed";
      }
    },
  };
}
