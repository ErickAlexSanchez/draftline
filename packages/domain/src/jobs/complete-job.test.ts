import { completeClaimedJob } from "./complete-job";
import type { BudgetStore, ClaimedJob, JobRepository, ModelGateway, ObjectStorage } from "../ports";

const job: ClaimedJob = {
  id: "44444444-4444-4444-8444-444444444444",
  tenantId: "11111111-1111-4111-8111-111111111111",
  title: "Harbor",
  prompt: "Write a welcome.",
  creditCost: 1,
};

function harness(credits: number): {
  modelCalls: () => number;
  stored: () => number;
  status: () => string;
  deps: Parameters<typeof completeClaimedJob>[0];
} {
  let modelCalls = 0;
  let stored = 0;
  let status = "running";
  const model: ModelGateway = {
    async generate() {
      modelCalls += 1;
      return { text: "A draft." };
    },
  };
  const storage: ObjectStorage = {
    async put() {
      stored += 1;
    },
    async get() {
      return null;
    },
    async delete() {
      stored = Math.max(0, stored - 1);
    },
  };
  const jobs = {
    enqueue: async () => undefined,
    claimNext: async () => null,
    list: async () => [],
    find: async () => null,
    markFailed: async () => {
      status = "failed";
    },
  } satisfies JobRepository;
  const budget: BudgetStore = {
    async readCredits() {
      return credits;
    },
    async commitSuccess() {
      if (credits < job.creditCost) {
        status = "failed";
        return { ok: false, code: "insufficient_credits" };
      }
      status = "succeeded";
      return { ok: true };
    },
  };
  return {
    modelCalls: () => modelCalls,
    stored: () => stored,
    status: () => status,
    deps: { jobs, budget, model, storage, clock: { now: () => new Date("2026-01-01T00:00:00.000Z") } },
  };
}

describe("completeClaimedJob", () => {
  it("does not call the model or write a file when credits are zero", async () => {
    const gate = harness(0);
    const outcome = await completeClaimedJob(gate.deps, job);
    expect(outcome).toBe("failed");
    expect(gate.modelCalls()).toBe(0);
    expect(gate.stored()).toBe(0);
    expect(gate.status()).toBe("failed");
  });

  it("calls the model once and stores the draft when credits remain", async () => {
    const gate = harness(4);
    const outcome = await completeClaimedJob(gate.deps, job);
    expect(outcome).toBe("succeeded");
    expect(gate.modelCalls()).toBe(1);
    expect(gate.stored()).toBe(1);
    expect(gate.status()).toBe("succeeded");
  });
});
