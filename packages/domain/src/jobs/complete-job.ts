import { planGeneration } from "../budget/plan-generation";
import { objectKeyForJob } from "../files/object-key";
import type { BudgetStore, ClaimedJob, Clock, JobRepository, ModelGateway, ObjectStorage } from "../ports";

export async function completeClaimedJob(
  deps: {
    jobs: JobRepository;
    budget: BudgetStore;
    model: ModelGateway;
    storage: ObjectStorage;
    clock: Clock;
  },
  job: ClaimedJob,
): Promise<"succeeded" | "failed"> {
  const credits = await deps.budget.readCredits(job.tenantId);
  const decision = planGeneration({ credits, cost: job.creditCost });
  if (decision.outcome === "deny") {
    await deps.jobs.markFailed(job.id, decision.code, deps.clock.now());
    return "failed";
  }

  const generated = await deps.model.generate({ prompt: job.prompt });
  const key = objectKeyForJob(job.id);
  await deps.storage.put(key, generated.text);
  try {
    const committed = await deps.budget.commitSuccess({
      tenantId: job.tenantId,
      jobId: job.id,
      cost: job.creditCost,
      objectKey: key,
      now: deps.clock.now(),
    });
    if (!committed.ok) {
      await deps.storage.delete(key);
      return "failed";
    }
    return "succeeded";
  } catch (error) {
    try {
      await deps.storage.delete(key);
    } catch (deleteError) {
      throw new Error("Storage cleanup failed", { cause: deleteError });
    }
    throw error;
  }
}
