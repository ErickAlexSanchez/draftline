"use client";

import { useState, type FormEvent } from "react";
import { createdDraftSchema } from "@draftline/contracts";
import { ApiError, api } from "../lib/api";

export function SaveDraftForm({ onSaved }: { onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    const body = String(form.get("body") ?? "");
    setPending(true);
    setError(null);
    try {
      createdDraftSchema.parse(
        await api("/api/drafts", { method: "POST", body: JSON.stringify({ title, body }) }),
      );
      event.currentTarget.reset();
      onSaved();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        setError("You do not have permission to save drafts.");
      } else {
        setError("Couldn't save the draft.");
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
      <label htmlFor="draft-title">Title</label>
      <input id="draft-title" name="title" required maxLength={120} autoComplete="off" />
      <label htmlFor="draft-body">Brief</label>
      <textarea id="draft-body" name="body" required maxLength={4000} rows={6} />
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save draft"}
      </button>
    </form>
  );
}
