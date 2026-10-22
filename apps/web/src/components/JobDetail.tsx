"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { jobDetailQuery } from "../lib/queries";
import { StatusBadge } from "./StatusBadge";

export function JobDetail({ jobId, pollMs = 500 }: { jobId: string; pollMs?: number }) {
  const queryClient = useQueryClient();
  const query = useQuery(jobDetailQuery(jobId, pollMs));
  const invalidated = useRef(false);

  useEffect(() => {
    const status = query.data?.job.status;
    if (!status || invalidated.current) return;
    if (status === "succeeded" || status === "failed") {
      invalidated.current = true;
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  }, [query.data?.job.status, queryClient]);

  if (query.isPending) return <p aria-busy="true">Loading job…</p>;
  if (query.isError) {
    return (
      <div role="alert">
        <p>Couldn&apos;t load this job.</p>
        <button type="button" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const job = query.data.job;
  return (
    <article>
      <h1>{job.title}</h1>
      <StatusBadge status={job.status} live />
      {job.failureCode === "insufficient_credits" ? (
        <p role="alert">This workspace has no model credits left.</p>
      ) : null}
      {job.failureCode === "worker_error" ? <p role="alert">Generation failed before a draft was stored.</p> : null}
      <h2>Brief</h2>
      <p className="brief">{job.prompt}</p>
      {job.outputText ? (
        <section aria-label="Generated draft">
          <h2>Draft</h2>
          <div className="draft-text">{job.outputText}</div>
        </section>
      ) : (
        <p>The draft appears here when generation finishes.</p>
      )}
    </article>
  );
}
