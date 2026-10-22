"use client";

import { useQuery } from "@tanstack/react-query";
import { formatWhen } from "../lib/format";
import { jobsListQuery } from "../lib/queries";
import { StatusBadge } from "./StatusBadge";

export function JobList() {
  const query = useQuery(jobsListQuery());
  if (query.isPending) return <p aria-busy="true">Loading jobs…</p>;
  if (query.isError) {
    return (
      <div role="alert">
        <p>Couldn&apos;t load jobs.</p>
        <button type="button" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  }
  if (query.data.jobs.length === 0) return <p>No jobs yet.</p>;
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Generation jobs</caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          {query.data.jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <a href={`/jobs/${job.id}`}>{job.title}</a>
              </td>
              <td>
                <StatusBadge status={job.status} />
              </td>
              <td>
                <time dateTime={job.createdAt}>{formatWhen(job.createdAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
