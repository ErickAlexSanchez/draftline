"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { useCopy } from "../lib/preferences";

type SignInError = "invalid" | "failed";

export function LoginForm() {
  const copy = useCopy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<SignInError | null>(null);
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
      if (caught instanceof ApiError && caught.status === 401) setError("invalid");
      else setError("failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      {error ? (
        <p role="alert" className="alert">
          {error === "invalid" ? copy.signInInvalid : copy.signInFailed}
        </p>
      ) : null}
      <label htmlFor="email">{copy.email}</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">{copy.password}</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button type="submit" disabled={pending}>
        {pending ? copy.signingIn : copy.signIn}
      </button>
    </form>
  );
}
