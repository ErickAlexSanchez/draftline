"use client";

import { useState, type FormEvent } from "react";
import { createdJobSchema } from "@draftline/contracts";
import { ApiError, api } from "../lib/api";

export function NewJobForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [error, setError] = useState<string | null>(null);
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
      if (caught instanceof ApiError && caught.status === 403) {
        setError("You do not have permission to enqueue drafts.");
      } else if (caught instanceof ApiError && caught.status === 400) {
        setError("Check the title and the brief.");
      } else {
        setError("Couldn't enqueue the draft.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}
      <label htmlFor="title">Title</label>
      <input id="title" name="title" required maxLength={120} autoComplete="off" />
      <label htmlFor="brief">Brief</label>
      <textarea id="brief" name="prompt" required maxLength={4000} rows={8} />
      <p className="hint" id="brief-hint">
        Up to 4000 characters. The worker writes the draft after the job is queued.
      </p>
      <button type="submit" disabled={pending} aria-describedby="brief-hint">
        {pending ? "Enqueueing…" : "Enqueue draft"}
      </button>
    </form>
  );
}
