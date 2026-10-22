import { queryOptions } from "@tanstack/react-query";
import {
  accountSchema,
  draftDetailSchema,
  draftListSchema,
  jobDetailSchema,
  jobListSchema,
  type JobStatus,
} from "@draftline/contracts";
import { api } from "./api";

export const LIST_STALE_TIME_MS = 60_000;
export const JOB_DETAIL_STALE_TIME_MS = 0;

export function refetchIntervalForJobStatus(status: JobStatus | undefined, pollMs: number): number | false {
  if (status === "succeeded" || status === "failed") return false;
  return pollMs;
}

export function accountQuery() {
  return queryOptions({
    queryKey: ["me"] as const,
    staleTime: 0,
    queryFn: async () => accountSchema.parse(await api("/api/me")),
  });
}

export function jobsListQuery() {
  return queryOptions({
    queryKey: ["jobs"] as const,
    staleTime: LIST_STALE_TIME_MS,
    queryFn: async () => jobListSchema.parse(await api("/api/jobs")),
  });
}

export function jobDetailQuery(id: string, pollMs = 500) {
  return queryOptions({
    queryKey: ["jobs", id] as const,
    staleTime: JOB_DETAIL_STALE_TIME_MS,
    refetchInterval: (query) => refetchIntervalForJobStatus(query.state.data?.job.status, pollMs),
    queryFn: async () => jobDetailSchema.parse(await api(`/api/jobs/${encodeURIComponent(id)}`)),
  });
}

export function draftsListQuery() {
  return queryOptions({
    queryKey: ["drafts"] as const,
    staleTime: LIST_STALE_TIME_MS,
    queryFn: async () => draftListSchema.parse(await api("/api/drafts")),
  });
}

export function draftDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["drafts", id] as const,
    staleTime: LIST_STALE_TIME_MS,
    queryFn: async () => draftDetailSchema.parse(await api(`/api/drafts/${encodeURIComponent(id)}`)),
  });
}
