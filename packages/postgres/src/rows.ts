import { z } from "zod";
import type { DraftRecord, FailureCode, JobRecord, JobStatus, Principal, Role, TenantRecord, UserRecord } from "@draftline/domain";

const timestamp = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return value;
}, z.date());

const roleSchema = z.enum(["editor", "viewer"]);
const statusSchema = z.enum(["queued", "running", "succeeded", "failed"]);
const failureSchema = z.enum(["insufficient_credits", "worker_error"]).nullable();

type RowParser<T> = {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
};

export function parseRow<T>(schema: RowParser<T>, row: unknown): T {
  const parsed = schema.safeParse(row);
  if (!parsed.success) throw new Error("Unexpected database row shape");
  return parsed.data;
}

const userRow = z
  .object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    email: z.string().email(),
    password_hash: z.string(),
    role: roleSchema,
  })
  .transform(
    (row): UserRecord => ({
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
    }),
  );

const tenantRow = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    credits: z.number().int().nonnegative(),
  })
  .transform((row): TenantRecord => row);

const principalRow = z
  .object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    email: z.string().email(),
    role: roleSchema,
  })
  .transform(
    (row): Principal => ({
      userId: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      role: row.role,
    }),
  );

const jobListRow = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: statusSchema,
  created_at: timestamp,
});

const jobRow = z
  .object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    created_by: z.string().uuid(),
    draft_id: z.string().uuid().nullable(),
    title: z.string(),
    prompt: z.string(),
    status: statusSchema,
    failure_code: failureSchema,
    object_key: z.string().nullable(),
    credit_cost: z.number().int().positive(),
    created_at: timestamp,
    updated_at: timestamp,
  })
  .transform(
    (row): JobRecord => ({
      id: row.id,
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      draftId: row.draft_id,
      title: row.title,
      prompt: row.prompt,
      status: row.status,
      failureCode: row.failure_code,
      objectKey: row.object_key,
      creditCost: row.credit_cost,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  );

const claimedRow = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string(),
  prompt: z.string(),
  credit_cost: z.number().int().positive(),
});

const draftListRow = z.object({
  id: z.string().uuid(),
  title: z.string(),
  updated_at: timestamp,
});

const draftRow = z
  .object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    author_id: z.string().uuid(),
    title: z.string(),
    body: z.string(),
    created_at: timestamp,
    updated_at: timestamp,
  })
  .transform(
    (row): DraftRecord => ({
      id: row.id,
      tenantId: row.tenant_id,
      authorId: row.author_id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  );

export const rows = {
  user: userRow,
  tenant: tenantRow,
  principal: principalRow,
  jobList: jobListRow,
  job: jobRow,
  claimed: claimedRow,
  draftList: draftListRow,
  draft: draftRow,
};

export type { FailureCode, JobStatus, Role };
