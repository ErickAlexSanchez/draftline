"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { accountQuery } from "../lib/queries";
import { NewJobForm } from "./NewJobForm";
import { Shell } from "./Shell";

export function NewJobScreen() {
  const account = useQuery(accountQuery());
  const router = useRouter();
  const queryClient = useQueryClient();
  return (
    <Shell>
      {account.data && account.data.role === "editor" ? (
        <>
          <h1>New job</h1>
          <p>Enqueueing stores the brief. The worker writes the draft.</p>
          <NewJobForm
            onCreated={(id) => {
              void queryClient.invalidateQueries({ queryKey: ["jobs"] });
              router.push(`/jobs/${id}`);
            }}
          />
        </>
      ) : (
        <>
          <h1>New job</h1>
          <p>You can read drafts. Only editors can enqueue them.</p>
        </>
      )}
    </Shell>
  );
}
