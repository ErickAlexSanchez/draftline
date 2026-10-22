import { enqueueJob } from "./enqueue-job";
import { ForbiddenError } from "../errors";
import type { DraftRepository, JobRepository, Principal } from "../ports";

const editor: Principal = {
  userId: "22222222-2222-4222-8222-222222222222",
  tenantId: "11111111-1111-4111-8111-111111111111",
  email: "editor@draftline.example",
  role: "editor",
};

const viewer: Principal = { ...editor, role: "viewer", userId: "33333333-3333-4333-8333-333333333333" };

function jobsDouble(): JobRepository & { queued: number } {
  return {
    queued: 0,
    enqueue: async () => {
      jobs.queued += 1;
    },
    claimNext: async () => null,
    list: async () => [],
    find: async () => null,
    markFailed: async () => undefined,
  };
}

let jobs = jobsDouble();

const drafts: DraftRepository = {
  insert: async () => undefined,
  list: async () => [],
  find: async () => null,
};

const deps = {
  get jobs() {
    return jobs;
  },
  drafts,
  clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
  ids: { next: () => "44444444-4444-4444-8444-444444444444" },
  creditCost: 1,
};

describe("enqueueJob", () => {
  beforeEach(() => {
    jobs = jobsDouble();
  });

  it("persists a queued job for an editor and does not take a model gateway", async () => {
    const created = await enqueueJob(deps, editor, { title: "Harbor", prompt: "Write a welcome." });
    expect(created).toEqual({ id: "44444444-4444-4444-8444-444444444444", status: "queued" });
    expect(jobs.queued).toBe(1);
  });

  it("does not insert a job when the actor is a viewer", async () => {
    await expect(enqueueJob(deps, viewer, { title: "Harbor", prompt: "Write a welcome." })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(jobs.queued).toBe(0);
  });
});
