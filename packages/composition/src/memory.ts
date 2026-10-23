import { randomUUID } from "node:crypto";
import {
  FakeModelGateway,
  MemoryWorkspace,
  readDemoEnv,
  scryptHasher,
  systemClock,
  createTokenIssuer,
  type DemoEnv,
  type MemorySnapshot,
} from "@draftline/adapters";
import {
  authenticate,
  enqueueJob,
  enqueueJobFromDraft,
  getDraft,
  getJob,
  listDrafts,
  listJobs,
  loginUser,
  saveDraft,
} from "@draftline/domain";
import { processNextQueued } from "./process-next";
import type { ComposeOverrides, Container } from "./types";

const DEMO_EDITOR_EMAIL = "editor@draftline.example";
const DEMO_VIEWER_EMAIL = "viewer@draftline.example";
const DEMO_EDITOR_PASSWORD = "editor-local-pass";
const DEMO_VIEWER_PASSWORD = "viewer-local-pass";

export async function openDemoWorkspace(snapshot: MemorySnapshot | null): Promise<MemoryWorkspace> {
  return MemoryWorkspace.open(snapshot, {
    editorEmail: DEMO_EDITOR_EMAIL,
    viewerEmail: DEMO_VIEWER_EMAIL,
    editorPassword: DEMO_EDITOR_PASSWORD,
    viewerPassword: DEMO_VIEWER_PASSWORD,
  });
}

export function createMemoryContainer(
  workspace: MemoryWorkspace,
  env: DemoEnv = readDemoEnv(process.env),
  overrides: ComposeOverrides = {},
): Container {
  const storage = overrides.storage ?? workspace;
  const model = overrides.model ?? new FakeModelGateway(env.FAKE_MODEL_DELAY_MS);
  const clock = overrides.clock ?? systemClock;
  const tokens = createTokenIssuer(env.SESSION_SECRET);
  const ids = { next: () => randomUUID() };
  return {
    env,
    ping() {
      return Promise.resolve();
    },
    close() {
      return Promise.resolve();
    },
    login(input) {
      return loginUser(
        {
          users: workspace.users,
          sessions: workspace.sessions,
          passwords: scryptHasher,
          tokens,
          clock,
          ids,
          sessionTtlMs: env.SESSION_TTL_MS,
        },
        input,
      );
    },
    async logout(token) {
      if (!token) return;
      await workspace.sessions.deleteByTokenHash(tokens.hash(token));
    },
    authenticate(token) {
      return authenticate(workspace.sessions, tokens, token, clock.now());
    },
    async account(actor) {
      const tenant = await workspace.tenants.findById(actor.tenantId);
      if (!tenant) throw new Error("Tenant not found");
      return { email: actor.email, role: actor.role, tenantName: tenant.name, credits: tenant.credits };
    },
    listJobs(actor) {
      return listJobs(workspace.jobs, actor);
    },
    async getJob(actor, id) {
      const job = await getJob(workspace.jobs, actor, id);
      const outputText = job.objectKey ? await storage.get(job.objectKey) : null;
      return { job, outputText };
    },
    enqueue(actor, input) {
      return enqueueJob(
        { jobs: workspace.jobs, drafts: workspace.drafts, clock, ids, creditCost: env.MODEL_CREDIT_COST },
        actor,
        input,
      );
    },
    listDrafts(actor) {
      return listDrafts(workspace.drafts, actor);
    },
    getDraft(actor, id) {
      return getDraft(workspace.drafts, actor, id);
    },
    saveDraft(actor, input) {
      return saveDraft({ drafts: workspace.drafts, clock, ids }, actor, input);
    },
    enqueueFromDraft(actor, draftId) {
      return enqueueJobFromDraft(
        { jobs: workspace.jobs, drafts: workspace.drafts, clock, ids, creditCost: env.MODEL_CREDIT_COST },
        actor,
        draftId,
      );
    },
    processNextJob() {
      return processNextQueued({
        jobs: workspace.jobs,
        budget: workspace.budget,
        model,
        storage,
        clock,
        visibilityDelayMs: env.JOB_VISIBILITY_DELAY_MS,
      });
    },
  };
}
