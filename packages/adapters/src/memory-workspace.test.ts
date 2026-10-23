import { completeClaimedJob, enqueueJob, ForbiddenError, type ModelGateway, type Principal } from "@draftline/domain";
import {
  DEMO_EDITOR_ID,
  DEMO_TENANT_ID,
  DEMO_VIEWER_ID,
  MemoryWorkspace,
  packSnapshot,
  unpackSnapshot,
} from "@draftline/adapters";

const seed = {
  editorEmail: "editor@draftline.example",
  viewerEmail: "viewer@draftline.example",
  editorPassword: "editor-local-pass",
  viewerPassword: "viewer-local-pass",
};

const now = new Date("2026-01-01T00:00:00.000Z");
const clock = { now: () => now };
const ids = { next: () => "44444444-4444-4444-8444-444444444444" };
const secret = "replace-with-a-random-string-at-least-32-chars";

const editor: Principal = {
  userId: DEMO_EDITOR_ID,
  tenantId: DEMO_TENANT_ID,
  email: seed.editorEmail,
  role: "editor",
};

const viewer: Principal = {
  userId: DEMO_VIEWER_ID,
  tenantId: DEMO_TENANT_ID,
  email: seed.viewerEmail,
  role: "viewer",
};

function recordingModel(): ModelGateway & { calls: number } {
  return {
    calls: 0,
    async generate() {
      this.calls += 1;
      return { text: "Recorded draft body." };
    },
  };
}

async function enqueue(workspace: MemoryWorkspace, actor: Principal = editor): Promise<void> {
  await enqueueJob(
    { jobs: workspace.jobs, drafts: workspace.drafts, clock, ids, creditCost: 1 },
    actor,
    { title: "Harbor notes", prompt: "Write a short welcome for the harbor newsletter." },
  );
}

describe("memory workspace", () => {
  it("keeps an enqueued job queued until it is claimed", async () => {
    const workspace = await MemoryWorkspace.open(null, seed);
    await enqueue(workspace);
    const hidden = await workspace.jobs.claimNext(new Date(now.getTime() - 2000), now);
    expect(hidden).toBeNull();
    const job = await workspace.jobs.find(DEMO_TENANT_ID, ids.next());
    expect(job?.status).toBe("queued");
    expect(await workspace.budget.readCredits(DEMO_TENANT_ID)).toBe(20);
  });

  it("does not call the model when credits are zero", async () => {
    const seeded = await MemoryWorkspace.open(null, seed);
    const drained = seeded.snapshot();
    drained.credits = 0;
    const workspace = await MemoryWorkspace.open(drained, seed);
    const model = recordingModel();
    await enqueue(workspace);
    const claimed = await workspace.jobs.claimNext(now, now);
    if (!claimed) throw new Error("expected a claim");
    const outcome = await completeClaimedJob(
      { jobs: workspace.jobs, budget: workspace.budget, model, storage: workspace, clock },
      claimed,
    );
    expect(outcome).toBe("failed");
    expect(model.calls).toBe(0);
    const job = await workspace.jobs.find(DEMO_TENANT_ID, claimed.id);
    expect(job?.status).toBe("failed");
    expect(job?.failureCode).toBe("insufficient_credits");
    expect(job?.objectKey).toBeNull();
    expect(await workspace.budget.readCredits(DEMO_TENANT_ID)).toBe(0);
  });

  it("debits credits only when the job is marked succeeded", async () => {
    const workspace = await MemoryWorkspace.open(null, seed);
    const model = recordingModel();
    await enqueue(workspace);
    await expect(
      workspace.budget.commitSuccess({
        tenantId: DEMO_TENANT_ID,
        jobId: ids.next(),
        cost: 1,
        objectKey: `${ids.next()}.txt`,
        now,
      }),
    ).rejects.toThrow("Job was not running");
    expect(await workspace.budget.readCredits(DEMO_TENANT_ID)).toBe(20);
    const claimed = await workspace.jobs.claimNext(now, now);
    if (!claimed) throw new Error("expected a claim");
    const outcome = await completeClaimedJob(
      { jobs: workspace.jobs, budget: workspace.budget, model, storage: workspace, clock },
      claimed,
    );
    expect(outcome).toBe("succeeded");
    expect(model.calls).toBe(1);
    expect(await workspace.budget.readCredits(DEMO_TENANT_ID)).toBe(19);
    expect(await workspace.get(`${claimed.id}.txt`)).toBe("Recorded draft body.");
    const encoded = JSON.stringify(workspace.snapshot());
    expect(encoded).not.toContain("editor-local-pass");
    expect(encoded).not.toContain("scrypt");
    const restored = await MemoryWorkspace.open(unpackSnapshot(packSnapshot(workspace.snapshot(), secret), secret), seed);
    expect(await restored.budget.readCredits(DEMO_TENANT_ID)).toBe(19);
    expect(await restored.get(`${claimed.id}.txt`)).toBe("Recorded draft body.");
  });

  it("does not insert a job when a viewer enqueues", async () => {
    const workspace = await MemoryWorkspace.open(null, seed);
    await expect(
      enqueueJob(
        { jobs: workspace.jobs, drafts: workspace.drafts, clock, ids, creditCost: 1 },
        viewer,
        { title: "Nope", prompt: "A viewer cannot enqueue this." },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await workspace.jobs.list(DEMO_TENANT_ID)).toEqual([]);
  });

  it("rejects a snapshot whose signature does not match", async () => {
    const workspace = await MemoryWorkspace.open(null, seed);
    const chunks = packSnapshot(workspace.snapshot(), secret);
    const packed = chunks.join("");
    const dot = packed.indexOf(".");
    expect(unpackSnapshot([`aaaa.${packed.slice(dot + 1)}`], secret)).toBeNull();
    expect(unpackSnapshot([], secret)).toBeNull();
  });
});
