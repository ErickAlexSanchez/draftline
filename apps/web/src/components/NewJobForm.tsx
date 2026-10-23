"use client";

import { useState, type FormEvent } from "react";
import { createdJobSchema } from "@draftline/contracts";
import { ApiError, api } from "../lib/api";
import { useCopy } from "../lib/preferences";

type EnqueueError = "forbidden" | "invalid" | "failed";

export function NewJobForm({ onCreated }: { onCreated: (id: string) => void }) {
  const copy = useCopy();
  const [error, setError] = useState<EnqueueError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    const prompt = String(form.get("prompt") ?? "");
    setPending(true);
    setError(null);
    try {
      const created = createdJobSchema.parse(
        await api("/api/jobs", { method: "POST", body: JSON.stringify({ title, prompt }) }),
      );
      onCreated(created.id);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) setError("forbidden");
      else if (caught instanceof ApiError && caught.status === 400) setError("invalid");
      else setError("failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      {error ? (
        <p role="alert" className="alert">
          {error === "forbidden" ? copy.enqueueForbidden : error === "invalid" ? copy.enqueueInvalid : copy.enqueueFailed}
        </p>
      ) : null}
      <label htmlFor="title">{copy.fieldTitle}</label>
      <input id="title" name="title" required maxLength={120} autoComplete="off" />
      <label htmlFor="brief">{copy.fieldBrief}</label>
      <textarea id="brief" name="prompt" required maxLength={4000} rows={8} />
      <p className="hint" id="brief-hint">
        {copy.briefHint}
      </p>
      <button type="submit" disabled={pending} aria-describedby="brief-hint">
        {pending ? copy.enqueueing : copy.enqueue}
      </button>
    </form>
  );
}
