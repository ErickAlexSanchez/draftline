"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(null);
    try {
      await api("/api/sessions", { method: "POST", body: JSON.stringify({ email, password }) });
      queryClient.clear();
      router.push("/jobs");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setError("Email or password is incorrect.");
      else setError("Couldn't sign in.");
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
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
