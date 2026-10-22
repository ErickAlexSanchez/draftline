export const roles = ["editor", "viewer"] as const;
export type Role = (typeof roles)[number];

export const jobStatuses = ["queued", "running", "succeeded", "failed"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const failureCodes = ["insufficient_credits", "worker_error"] as const;
export type FailureCode = (typeof failureCodes)[number];

export type Principal = {
  userId: string;
  tenantId: string;
  email: string;
  role: Role;
};

export type UserRecord = {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  role: Role;
};

export type TenantRecord = {
  id: string;
  name: string;
  credits: number;
};

export type NewJob = {
  id: string;
  tenantId: string;
  createdBy: string;
  draftId: string | null;
  title: string;
  prompt: string;
  creditCost: number;
  createdAt: Date;
  updatedAt: Date;
};

export type JobListItem = {
  id: string;
  title: string;
  status: JobStatus;
  createdAt: Date;
};

export type JobRecord = JobListItem & {
  tenantId: string;
  createdBy: string;
  draftId: string | null;
  prompt: string;
  failureCode: FailureCode | null;
  objectKey: string | null;
  creditCost: number;
  updatedAt: Date;
};

export type ClaimedJob = {
  id: string;
  tenantId: string;
  title: string;
  prompt: string;
  creditCost: number;
};

export type NewDraft = {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DraftListItem = {
  id: string;
  title: string;
  updatedAt: Date;
};

export type DraftRecord = DraftListItem & {
  body: string;
  createdAt: Date;
  authorId: string;
  tenantId: string;
};

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface ModelGateway {
  generate(input: { prompt: string }): Promise<{ text: string }>;
}

export interface ObjectStorage {
  put(key: string, body: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

export interface JobQueue {
  enqueue(job: NewJob): Promise<void>;
  claimNext(visibleBefore: Date, now: Date): Promise<ClaimedJob | null>;
}

export interface JobRepository extends JobQueue {
  list(tenantId: string): Promise<JobListItem[]>;
  find(tenantId: string, id: string): Promise<JobRecord | null>;
  markFailed(id: string, code: FailureCode, now: Date): Promise<void>;
}

export interface DraftRepository {
  insert(draft: NewDraft): Promise<void>;
  list(tenantId: string): Promise<DraftListItem[]>;
  find(tenantId: string, id: string): Promise<DraftRecord | null>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
}

export interface SessionRepository {
  insert(session: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<void>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  findPrincipal(tokenHash: string, now: Date): Promise<Principal | null>;
}

export interface TenantRepository {
  findById(id: string): Promise<TenantRecord | null>;
}

export interface BudgetStore {
  readCredits(tenantId: string): Promise<number>;
  commitSuccess(input: {
    tenantId: string;
    jobId: string;
    cost: number;
    objectKey: string;
    now: Date;
  }): Promise<{ ok: true } | { ok: false; code: "insufficient_credits" }>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
  dummyHash(): Promise<string>;
}

export interface TokenIssuer {
  issue(): { token: string; tokenHash: string };
  hash(token: string): string;
}
