"use client";

import { useQuery } from "@tanstack/react-query";
import { formatWhen } from "../lib/format";
import { draftsListQuery } from "../lib/queries";

export function DraftList({
  canWrite,
  onGenerate,
}: {
  canWrite: boolean;
  onGenerate?: (id: string) => Promise<void>;
}) {
  const query = useQuery(draftsListQuery());
  if (query.isPending) return <p aria-busy="true">Loading drafts…</p>;
  if (query.isError) {
    return (
      <div role="alert">
        <p>Couldn&apos;t load drafts.</p>
        <button type="button" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  }
  if (query.data.drafts.length === 0) return <p>No saved drafts yet.</p>;
  return (
    <ul className="draft-list">
      {query.data.drafts.map((draft) => (
        <li key={draft.id}>
          <a href={`/drafts/${draft.id}`}>{draft.title}</a>
          <span>Updated {formatWhen(draft.updatedAt)}</span>
          {canWrite && onGenerate ? (
            <button type="button" onClick={() => void onGenerate(draft.id)}>
              Generate
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
