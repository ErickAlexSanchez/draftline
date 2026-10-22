import {
  JOB_DETAIL_STALE_TIME_MS,
  LIST_STALE_TIME_MS,
  draftsListQuery,
  jobDetailQuery,
  jobsListQuery,
  refetchIntervalForJobStatus,
} from "./queries";

describe("query timing", () => {
  it("keeps lists warm and follows a job until it finishes", () => {
    expect(LIST_STALE_TIME_MS).toBeGreaterThanOrEqual(60_000);
    expect(JOB_DETAIL_STALE_TIME_MS).toBe(0);
    expect(jobsListQuery().staleTime).toBe(LIST_STALE_TIME_MS);
    expect(draftsListQuery().staleTime).toBe(LIST_STALE_TIME_MS);
    expect(jobDetailQuery("44444444-4444-4444-8444-444444444444").staleTime).toBe(0);
    expect(refetchIntervalForJobStatus("queued", 500)).toBe(500);
    expect(refetchIntervalForJobStatus("running", 500)).toBe(500);
    expect(refetchIntervalForJobStatus(undefined, 500)).toBe(500);
    expect(refetchIntervalForJobStatus("succeeded", 500)).toBe(false);
    expect(refetchIntervalForJobStatus("failed", 500)).toBe(false);
  });
});
