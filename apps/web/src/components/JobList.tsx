"use client";

import { useQuery } from "@tanstack/react-query";
import { formatWhen } from "../lib/format";
import { useCopy, usePreferences } from "../lib/preferences";
import { jobsListQuery } from "../lib/queries";
import { StatusBadge } from "./StatusBadge";

export function JobList() {
  const copy = useCopy();
  const { locale } = usePreferences();
  const query = useQuery(jobsListQuery());
  if (query.isPending) return <p aria-busy="true">{copy.loadingJobs}</p>;
  if (query.isError) {
    return (
      <div role="alert">
        <p>{copy.jobsError}</p>
        <button type="button" onClick={() => void query.refetch()}>
          {copy.retry}
        </button>
      </div>
    );
  }
  if (query.data.jobs.length === 0) return <p>{copy.emptyJobs}</p>;
  return (
    <div className="table-wrap">
      <table className="job-table">
        <caption className="sr-only">{copy.jobsCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.columnTitle}</th>
            <th scope="col">{copy.columnStatus}</th>
            <th scope="col">{copy.columnCreated}</th>
          </tr>
        </thead>
        <tbody>
          {query.data.jobs.map((job) => (
            <tr key={job.id}>
              <td data-label={copy.columnTitle}>
                <a href={`/jobs/${job.id}`}>{job.title}</a>
              </td>
              <td data-label={copy.columnStatus}>
                <StatusBadge status={job.status} />
              </td>
              <td data-label={copy.columnCreated}>
                <time dateTime={job.createdAt}>{formatWhen(job.createdAt, locale)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
