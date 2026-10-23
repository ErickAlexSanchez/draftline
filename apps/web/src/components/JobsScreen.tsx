"use client";

import { useCopy } from "../lib/preferences";
import { JobList } from "./JobList";
import { Shell } from "./Shell";

export function JobsScreen() {
  const copy = useCopy();
  return (
    <Shell>
      <h1>{copy.jobs}</h1>
      <JobList />
    </Shell>
  );
}
