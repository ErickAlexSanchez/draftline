"use client";

import { JobList } from "./JobList";
import { Shell } from "./Shell";

export function JobsScreen() {
  return (
    <Shell>
      <h1>Jobs</h1>
      <JobList />
    </Shell>
  );
}
