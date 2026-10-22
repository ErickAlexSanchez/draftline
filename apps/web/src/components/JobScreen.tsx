"use client";

import { JobDetail } from "./JobDetail";
import { Shell } from "./Shell";

export function JobScreen({ jobId }: { jobId: string }) {
  return (
    <Shell>
      <JobDetail jobId={jobId} />
    </Shell>
  );
}
