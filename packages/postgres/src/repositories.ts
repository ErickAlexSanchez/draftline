import type { Pool } from "pg";
import type {
  ClaimedJob,
  DraftListItem,
  DraftRecord,
  DraftRepository,
  JobListItem,
  JobRecord,
  JobRepository,
  NewDraft,
  NewJob,
  Principal,
  TenantRecord,
  TenantRepository,
  UserRecord,
  UserRepository,
  SessionRepository,
} from "@draftline/domain";
import { parseRow, rows } from "./rows";

export class PgUsers implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email],
    );
    const row = result.rows[0];
    if (!row) return null;
    return parseRow(rows.user, row);
  }
}

export class PgTenants implements TenantRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<TenantRecord | null> {
    const result = await this.pool.query("SELECT id, name, credits FROM tenants WHERE id = $1", [id]);
    const row = result.rows[0];
    if (!row) return null;
    return parseRow(rows.tenant, row);
  }
}

export class PgSessions implements SessionRepository {
  constructor(private readonly pool: Pool) {}

  async insert(session: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt],
    );
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }

  async findPrincipal(tokenHash: string, now: Date): Promise<Principal | null> {
    const result = await this.pool.query(
      `SELECT u.id, u.tenant_id, u.email, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > $2`,
      [tokenHash, now],
    );
    const row = result.rows[0];
    if (!row) return null;
    return parseRow(rows.principal, row);
  }
}

export class PgJobs implements JobRepository {
  constructor(private readonly pool: Pool) {}

  async enqueue(job: NewJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO jobs (
         id, tenant_id, created_by, draft_id, title, prompt, status, failure_code, object_key, credit_cost, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'queued', NULL, NULL, $7, $8, $9
       )`,
      [job.id, job.tenantId, job.createdBy, job.draftId, job.title, job.prompt, job.creditCost, job.createdAt, job.updatedAt],
    );
  }

  async claimNext(visibleBefore: Date, now: Date): Promise<ClaimedJob | null> {
    const result = await this.pool.query(
      `WITH next_job AS (
         SELECT id
         FROM jobs
         WHERE status = 'queued' AND created_at <= $1
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE jobs
       SET status = 'running', updated_at = $2
       FROM next_job
       WHERE jobs.id = next_job.id
       RETURNING jobs.id, jobs.tenant_id, jobs.title, jobs.prompt, jobs.credit_cost`,
      [visibleBefore, now],
    );
    const row = result.rows[0];
    if (!row) return null;
    const parsed = parseRow(rows.claimed, row);
    return {
      id: parsed.id,
      tenantId: parsed.tenant_id,
      title: parsed.title,
      prompt: parsed.prompt,
      creditCost: parsed.credit_cost,
    };
  }

  async list(tenantId: string): Promise<JobListItem[]> {
    const result = await this.pool.query(
      `SELECT id, title, status, created_at
       FROM jobs
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [tenantId],
    );
    return result.rows.map((row: unknown) => {
      const parsed = parseRow(rows.jobList, row);
      return { id: parsed.id, title: parsed.title, status: parsed.status, createdAt: parsed.created_at };
    });
  }

  async find(tenantId: string, id: string): Promise<JobRecord | null> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, created_by, draft_id, title, prompt, status, failure_code, object_key, credit_cost, created_at, updated_at
       FROM jobs
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return parseRow(rows.job, row);
  }

  async markFailed(id: string, code: "insufficient_credits" | "worker_error", now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE jobs
       SET status = 'failed', failure_code = $2, object_key = NULL, updated_at = $3
       WHERE id = $1 AND status = 'running'`,
      [id, code, now],
    );
  }
}

export class PgDrafts implements DraftRepository {
  constructor(private readonly pool: Pool) {}

  async insert(draft: NewDraft): Promise<void> {
    await this.pool.query(
      `INSERT INTO drafts (id, tenant_id, author_id, title, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [draft.id, draft.tenantId, draft.authorId, draft.title, draft.body, draft.createdAt, draft.updatedAt],
    );
  }

  async list(tenantId: string): Promise<DraftListItem[]> {
    const result = await this.pool.query(
      `SELECT id, title, updated_at
       FROM drafts
       WHERE tenant_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [tenantId],
    );
    return result.rows.map((row: unknown) => {
      const parsed = parseRow(rows.draftList, row);
      return { id: parsed.id, title: parsed.title, updatedAt: parsed.updated_at };
    });
  }

  async find(tenantId: string, id: string): Promise<DraftRecord | null> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, author_id, title, body, created_at, updated_at
       FROM drafts
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return parseRow(rows.draft, row);
  }
}
