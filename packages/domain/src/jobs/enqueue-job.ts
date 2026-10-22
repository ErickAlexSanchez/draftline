import { NotFoundError } from "../errors";
import { assertEditor } from "../identity/authorize";
import type { DraftRepository, IdGenerator, JobRepository, Principal } from "../ports";
import type { Clock } from "../ports";
import { sameTenant } from "../tenancy/access";

export async function enqueueJob(
  deps: {
    jobs: JobRepository;
    drafts: DraftRepository;
    clock: Clock;
    ids: IdGenerator;
    creditCost: number;
  },
  actor: Principal,
  input: { title: string; prompt: string; draftId?: string | null },
): Promise<{ id: string; status: "queued" }> {
  assertEditor(actor.role);
  const draftId = input.draftId ?? null;
  if (draftId) {
    const draft = await deps.drafts.find(actor.tenantId, draftId);
    if (!draft || !sameTenant(actor.tenantId, draft.tenantId)) throw new NotFoundError();
  }
  return insertQueued(deps, actor, { title: input.title, prompt: input.prompt, draftId });
}

export async function enqueueJobFromDraft(
  deps: {
    jobs: JobRepository;
    drafts: DraftRepository;
    clock: Clock;
    ids: IdGenerator;
    creditCost: number;
  },
  actor: Principal,
  draftId: string,
): Promise<{ id: string; status: "queued" }> {
  assertEditor(actor.role);
  const draft = await deps.drafts.find(actor.tenantId, draftId);
  if (!draft || !sameTenant(actor.tenantId, draft.tenantId)) throw new NotFoundError();
  return insertQueued(deps, actor, { title: draft.title, prompt: draft.body, draftId: draft.id });
}

async function insertQueued(
  deps: {
    jobs: JobRepository;
    clock: Clock;
    ids: IdGenerator;
    creditCost: number;
  },
  actor: Principal,
  input: { title: string; prompt: string; draftId: string | null },
): Promise<{ id: string; status: "queued" }> {
  const now = deps.clock.now();
  const id = deps.ids.next();
  await deps.jobs.enqueue({
    id,
    tenantId: actor.tenantId,
    createdBy: actor.userId,
    draftId: input.draftId,
    title: input.title,
    prompt: input.prompt,
    creditCost: deps.creditCost,
    createdAt: now,
    updatedAt: now,
  });
  return { id, status: "queued" };
}
