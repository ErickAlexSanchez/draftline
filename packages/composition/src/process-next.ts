import { log } from "@draftline/adapters";
import { completeClaimedJob, type BudgetStore, type Clock, type JobRepository, type ModelGateway, type ObjectStorage } from "@draftline/domain";

export async function processNextQueued(input: {
  jobs: JobRepository;
  budget: BudgetStore;
  model: ModelGateway;
  storage: ObjectStorage;
  clock: Clock;
  visibilityDelayMs: number;
}): Promise<"idle" | "processed"> {
  const now = input.clock.now();
  const visibleBefore = new Date(now.getTime() - input.visibilityDelayMs);
  const claimed = await input.jobs.claimNext(visibleBefore, now);
  if (!claimed) return "idle";
  try {
    const outcome = await completeClaimedJob(
      {
        jobs: input.jobs,
        budget: input.budget,
        model: input.model,
        storage: input.storage,
        clock: input.clock,
      },
      claimed,
    );
    log("info", { msg: "job_finished", jobId: claimed.id, outcome });
    return "processed";
  } catch (error) {
    log("error", { msg: "job_failed", jobId: claimed.id, err: error });
    try {
      await input.jobs.markFailed(claimed.id, "worker_error", input.clock.now());
    } catch (markError) {
      log("error", { msg: "job_mark_failed", jobId: claimed.id, err: markError });
    }
    return "processed";
  }
}
