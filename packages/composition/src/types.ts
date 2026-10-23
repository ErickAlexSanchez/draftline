import type { DemoEnv } from "@draftline/adapters";
import type {
  Clock,
  ModelGateway,
  ObjectStorage,
  Principal,
  enqueueJob,
  enqueueJobFromDraft,
  getDraft,
  getJob,
  listDrafts,
  listJobs,
  saveDraft,
} from "@draftline/domain";

export type ComposeOverrides = {
  model?: ModelGateway;
  storage?: ObjectStorage;
  clock?: Clock;
};

export type Container = {
  env: DemoEnv & { DATABASE_URL?: string };
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
