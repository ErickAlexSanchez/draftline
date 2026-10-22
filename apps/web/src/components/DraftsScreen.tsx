"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createdJobSchema } from "@draftline/contracts";
import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { accountQuery } from "../lib/queries";
import { DraftList } from "./DraftList";
import { SaveDraftForm } from "./SaveDraftForm";
import { Shell } from "./Shell";

export function DraftsScreen() {
  const account = useQuery(accountQuery());
  const queryClient = useQueryClient();
  const router = useRouter();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const canWrite = account.data?.role === "editor";

  async function generate(id: string): Promise<void> {
    setGenerateError(null);
    try {
      const created = createdJobSchema.parse(await api(`/api/drafts/${id}/jobs`, { method: "POST" }));
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      router.push(`/jobs/${created.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setGenerateError("You do not have permission to enqueue drafts.");
      } else {
        setGenerateError("Couldn't enqueue this draft.");
      }
    }
  }

  return (
    <Shell>
      <h1>Drafts</h1>
      <p>Saved briefs stay in the workspace. Generation runs only after you enqueue a job.</p>
      {generateError ? (
        <p role="alert" className="alert">
          {generateError}
        </p>
      ) : null}
      {account.data && canWrite ? (
        <SaveDraftForm
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["drafts"] });
          }}
        />
      ) : (
        <p>Editors can save a brief here.</p>
      )}
      <DraftList canWrite={Boolean(canWrite)} onGenerate={generate} />
    </Shell>
  );
}
