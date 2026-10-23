"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { accountQuery } from "../lib/queries";
import { useCopy } from "../lib/preferences";
import { NewJobForm } from "./NewJobForm";
import { Shell } from "./Shell";

export function NewJobScreen() {
  const copy = useCopy();
  const account = useQuery(accountQuery());
  const router = useRouter();
  const queryClient = useQueryClient();
  return (
    <Shell>
      {account.data && account.data.role === "editor" ? (
        <>
          <h1>{copy.newJob}</h1>
          <p>{copy.newJobLead}</p>
          <NewJobForm
            onCreated={(id) => {
              void queryClient.invalidateQueries({ queryKey: ["jobs"] });
              router.push(`/jobs/${id}`);
            }}
          />
        </>
      ) : (
        <>
          <h1>{copy.newJob}</h1>
          <p>{copy.newJobViewer}</p>
        </>
      )}
    </Shell>
  );
}
