import type {
  BudgetStore,
  ClaimedJob,
  DraftListItem,
  DraftRecord,
  DraftRepository,
  FailureCode,
  JobListItem,
  JobRecord,
  JobRepository,
  NewDraft,
  NewJob,
  ObjectStorage,
  Principal,
  SessionRepository,
  TenantRecord,
  TenantRepository,
  UserRecord,
  UserRepository,
} from "@draftline/domain";
import { isStorageKey } from "@draftline/domain";
import {
  DEMO_CREDITS,
  DEMO_EDITOR_ID,
  DEMO_TENANT_ID,
  DEMO_VIEWER_ID,
  type MemorySnapshot,
} from "./memory-snapshot";
import { scryptHasher } from "./password";

export type DemoSeed = {
  editorEmail: string;
  viewerEmail: string;
  editorPassword: string;
  viewerPassword: string;
};

type SessionRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
};

const passwordHashes = new Map<string, Promise<string>>();

function cachedHash(password: string): Promise<string> {
  const existing = passwordHashes.get(password);
  if (existing) return existing;
  const created = scryptHasher.hash(password);
  passwordHashes.set(password, created);
  return created;
}

function byNewest(left: Date, right: Date): number {
  return right.getTime() - left.getTime();
}

export class MemoryWorkspace implements ObjectStorage {
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly tenants: TenantRepository;
  readonly jobs: JobRepository;
  readonly drafts: DraftRepository;
  readonly budget: BudgetStore;

  private readonly userRows: UserRecord[];
  private readonly sessionRows: SessionRow[];
  private readonly jobRows: JobRecord[];
  private readonly draftRows: DraftRecord[];
  private readonly objects = new Map<string, string>();
  private readonly tenant: TenantRecord;

  private constructor(users: UserRecord[], snapshot: MemorySnapshot | null) {
    this.userRows = users;
    this.tenant = {
      id: DEMO_TENANT_ID,
      name: "Draftline",
      credits: snapshot?.credits ?? DEMO_CREDITS,
    };
    this.sessionRows = (snapshot?.sessions ?? []).map((session) => ({
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: new Date(session.expiresAt),
      createdAt: new Date(session.createdAt),
    }));
    this.jobRows = (snapshot?.jobs ?? []).map((job) => ({
      ...job,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
    }));
    this.draftRows = (snapshot?.drafts ?? []).map((draft) => ({
      ...draft,
      createdAt: new Date(draft.createdAt),
      updatedAt: new Date(draft.updatedAt),
    }));
    for (const [key, body] of Object.entries(snapshot?.objects ?? {})) {
      this.objects.set(key, body);
    }

    this.users = { findByEmail: (email) => this.findUser(email) };
    this.sessions = {
      insert: (session) => this.insertSession(session),
      deleteByTokenHash: (tokenHash) => this.deleteSession(tokenHash),
      findPrincipal: (tokenHash, now) => this.findPrincipal(tokenHash, now),
    };
    this.tenants = { findById: (id) => this.findTenant(id) };
    this.jobs = {
      enqueue: (job) => this.enqueueJob(job),
      claimNext: (visibleBefore, now) => this.claimJob(visibleBefore, now),
      list: (tenantId) => this.listJobs(tenantId),
      find: (tenantId, id) => this.findJob(tenantId, id),
      markFailed: (id, code, now) => this.markJobFailed(id, code, now),
    };
    this.drafts = {
      insert: (draft) => this.insertDraft(draft),
      list: (tenantId) => this.listDrafts(tenantId),
      find: (tenantId, id) => this.findDraft(tenantId, id),
    };
    this.budget = {
      readCredits: (tenantId) => this.readCredits(tenantId),
      commitSuccess: (input) => this.commitSuccess(input),
    };
  }

  static async open(snapshot: MemorySnapshot | null, seed: DemoSeed): Promise<MemoryWorkspace> {
    const editorHash = await cachedHash(seed.editorPassword);
    const viewerHash = await cachedHash(seed.viewerPassword);
    const users: UserRecord[] = [
      {
        id: DEMO_EDITOR_ID,
        tenantId: DEMO_TENANT_ID,
        email: seed.editorEmail.trim().toLowerCase(),
        passwordHash: editorHash,
        role: "editor",
      },
      {
        id: DEMO_VIEWER_ID,
        tenantId: DEMO_TENANT_ID,
        email: seed.viewerEmail.trim().toLowerCase(),
        passwordHash: viewerHash,
        role: "viewer",
      },
    ];
    return new MemoryWorkspace(users, snapshot);
  }

  snapshot(): MemorySnapshot {
    const jobs = [...this.jobRows].sort((a, b) => byNewest(a.createdAt, b.createdAt)).slice(0, 50);
    const drafts = [...this.draftRows].sort((a, b) => byNewest(a.updatedAt, b.updatedAt)).slice(0, 50);
    const sessions = [...this.sessionRows].sort((a, b) => byNewest(a.createdAt, b.createdAt)).slice(0, 20);
    const objects: Record<string, string> = {};
    for (const job of jobs) {
      if (!job.objectKey) continue;
      const body = this.objects.get(job.objectKey);
      if (body !== undefined) objects[job.objectKey] = body;
    }
    return {
      v: 1,
      credits: this.tenant.credits,
      sessions: sessions.map((session) => ({
        id: session.id,
        userId: session.userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
      })),
      jobs: jobs.map((job) => ({
        id: job.id,
        tenantId: job.tenantId,
        createdBy: job.createdBy,
        draftId: job.draftId,
        title: job.title,
        prompt: job.prompt,
        status: job.status,
        failureCode: job.failureCode,
        objectKey: job.objectKey,
        creditCost: job.creditCost,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      })),
      drafts: drafts.map((draft) => ({
        id: draft.id,
        tenantId: draft.tenantId,
        authorId: draft.authorId,
        title: draft.title,
        body: draft.body,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
      })),
      objects,
    };
  }

  async put(key: string, body: string): Promise<void> {
    if (!isStorageKey(key)) throw new Error("Invalid storage key");
    this.objects.set(key, body);
  }

  async get(key: string): Promise<string | null> {
    if (!isStorageKey(key)) throw new Error("Invalid storage key");
    return this.objects.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    if (!isStorageKey(key)) throw new Error("Invalid storage key");
    this.objects.delete(key);
  }

  private async findUser(email: string): Promise<UserRecord | null> {
    const key = email.trim().toLowerCase();
    return this.userRows.find((user) => user.email === key) ?? null;
  }

  private async insertSession(session: SessionRow): Promise<void> {
    this.sessionRows.push(session);
  }

  private async deleteSession(tokenHash: string): Promise<void> {
    const index = this.sessionRows.findIndex((session) => session.tokenHash === tokenHash);
    if (index >= 0) this.sessionRows.splice(index, 1);
  }

  private async findPrincipal(tokenHash: string, now: Date): Promise<Principal | null> {
    const session = this.sessionRows.find((row) => row.tokenHash === tokenHash && row.expiresAt.getTime() > now.getTime());
    if (!session) return null;
    const user = this.userRows.find((row) => row.id === session.userId);
    if (!user) return null;
    return { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role };
  }

  private async findTenant(id: string): Promise<TenantRecord | null> {
    if (id !== this.tenant.id) return null;
    return { id: this.tenant.id, name: this.tenant.name, credits: this.tenant.credits };
  }

  private async readCredits(tenantId: string): Promise<number> {
    if (tenantId !== this.tenant.id) throw new Error("Tenant not found");
    return this.tenant.credits;
  }

  private async commitSuccess(input: {
    tenantId: string;
    jobId: string;
    cost: number;
    objectKey: string;
    now: Date;
  }): Promise<{ ok: true } | { ok: false; code: "insufficient_credits" }> {
    if (input.tenantId !== this.tenant.id) throw new Error("Tenant not found");
    const job = this.jobRows.find((row) => row.id === input.jobId);
    if (this.tenant.credits < input.cost) {
      if (job && job.status === "running") {
        job.status = "failed";
        job.failureCode = "insufficient_credits";
        job.objectKey = null;
        job.updatedAt = input.now;
      }
      return { ok: false, code: "insufficient_credits" };
    }
    if (!job || job.status !== "running") throw new Error("Job was not running");
    this.tenant.credits -= input.cost;
    job.status = "succeeded";
    job.failureCode = null;
    job.objectKey = input.objectKey;
    job.updatedAt = input.now;
    return { ok: true };
  }

  private async enqueueJob(job: NewJob): Promise<void> {
    this.jobRows.push({
      id: job.id,
      tenantId: job.tenantId,
      createdBy: job.createdBy,
      draftId: job.draftId,
      title: job.title,
      prompt: job.prompt,
      status: "queued",
      failureCode: null,
      objectKey: null,
      creditCost: job.creditCost,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  }

  private async claimJob(visibleBefore: Date, now: Date): Promise<ClaimedJob | null> {
    const next = this.jobRows
      .filter((job) => job.status === "queued" && job.createdAt.getTime() <= visibleBefore.getTime())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))[0];
    if (!next) return null;
    next.status = "running";
    next.updatedAt = now;
    return {
      id: next.id,
      tenantId: next.tenantId,
      title: next.title,
      prompt: next.prompt,
      creditCost: next.creditCost,
    };
  }

  private async listJobs(tenantId: string): Promise<JobListItem[]> {
    return this.jobRows
      .filter((job) => job.tenantId === tenantId)
      .sort((a, b) => byNewest(a.createdAt, b.createdAt))
      .slice(0, 50)
      .map((job) => ({ id: job.id, title: job.title, status: job.status, createdAt: job.createdAt }));
  }

  private async findJob(tenantId: string, id: string): Promise<JobRecord | null> {
    return this.jobRows.find((job) => job.tenantId === tenantId && job.id === id) ?? null;
  }

  private async markJobFailed(id: string, code: FailureCode, now: Date): Promise<void> {
    const job = this.jobRows.find((row) => row.id === id && row.status === "running");
    if (!job) return;
    job.status = "failed";
    job.failureCode = code;
    job.objectKey = null;
    job.updatedAt = now;
  }

  private async insertDraft(draft: NewDraft): Promise<void> {
    this.draftRows.push(draft);
  }

  private async listDrafts(tenantId: string): Promise<DraftListItem[]> {
    return this.draftRows
      .filter((draft) => draft.tenantId === tenantId)
      .sort((a, b) => byNewest(a.updatedAt, b.updatedAt))
      .slice(0, 50)
      .map((draft) => ({ id: draft.id, title: draft.title, updatedAt: draft.updatedAt }));
  }

  private async findDraft(tenantId: string, id: string): Promise<DraftRecord | null> {
    return this.draftRows.find((draft) => draft.tenantId === tenantId && draft.id === id) ?? null;
  }
}
