import { NotFoundError } from "../errors";
import { assertEditor } from "../identity/authorize";
import type { DraftListItem, DraftRecord, DraftRepository, IdGenerator, JobListItem, JobRecord, JobRepository, Principal } from "../ports";
import type { Clock } from "../ports";
import { sameTenant } from "../tenancy/access";

export async function listJobs(jobs: JobRepository, actor: Principal): Promise<JobListItem[]> {
  return jobs.list(actor.tenantId);
}

export async function getJob(jobs: JobRepository, actor: Principal, id: string): Promise<JobRecord> {
  const job = await jobs.find(actor.tenantId, id);
  if (!job || !sameTenant(actor.tenantId, job.tenantId)) throw new NotFoundError();
  return job;
}

export async function listDrafts(drafts: DraftRepository, actor: Principal): Promise<DraftListItem[]> {
  return drafts.list(actor.tenantId);
}

export async function getDraft(drafts: DraftRepository, actor: Principal, id: string): Promise<DraftRecord> {
  const draft = await drafts.find(actor.tenantId, id);
  if (!draft || !sameTenant(actor.tenantId, draft.tenantId)) throw new NotFoundError();
  return draft;
}

export async function saveDraft(
  deps: { drafts: DraftRepository; clock: Clock; ids: IdGenerator },
  actor: Principal,
  input: { title: string; body: string },
): Promise<{ id: string }> {
  assertEditor(actor.role);
  const now = deps.clock.now();
  const id = deps.ids.next();
  await deps.drafts.insert({
    id,
    tenantId: actor.tenantId,
    authorId: actor.userId,
    title: input.title,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}
