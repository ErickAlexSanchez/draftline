"use client";

import { useQuery } from "@tanstack/react-query";
import { draftDetailQuery } from "../lib/queries";

export function DraftDetail({ draftId }: { draftId: string }) {
  const query = useQuery(draftDetailQuery(draftId));
  if (query.isPending) return <p aria-busy="true">Loading draft…</p>;
  if (query.isError) {
    return (
      <div role="alert">
        <p>Couldn&apos;t load this draft.</p>
        <button type="button" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  }
  const draft = query.data.draft;
  return (
    <article>
      <h1>{draft.title}</h1>
      <h2>Brief</h2>
      <p className="brief">{draft.body}</p>
    </article>
  );
}
