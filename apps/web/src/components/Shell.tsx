"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, api } from "../lib/api";
import { accountQuery } from "../lib/queries";

export function Shell({ children }: { children: ReactNode }) {
  const query = useQuery(accountQuery());
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) router.replace("/login");
  }, [query.error, router]);

  async function signOut(): Promise<void> {
    setSignOutError(null);
    try {
      await api("/api/sessions", { method: "DELETE" });
      queryClient.clear();
      router.replace("/login");
    } catch (error) {
      if (error instanceof ApiError) setSignOutError("Couldn't sign out.");
      else setSignOutError("Couldn't sign out.");
    }
  }

  if (query.isPending) {
    return (
      <main id="content">
        <p aria-busy="true">Loading workspace…</p>
      </main>
    );
  }
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 401) {
      return (
        <main id="content">
          <p>Redirecting to sign in…</p>
        </main>
      );
    }
    return (
      <main id="content">
        <div role="alert">
          <p>Couldn&apos;t load the workspace.</p>
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  const account = query.data;
  return (
    <>
      <header className="topbar">
        <div>
          <a className="wordmark" href="/jobs">
            Draftline
          </a>
          <p className="tagline">Briefs become drafts.</p>
        </div>
        <nav aria-label="Workspace">
          <ul className="nav-list">
            <li>
              <a href="/jobs">Jobs</a>
            </li>
            <li>
              <a href="/drafts">Drafts</a>
            </li>
            {account.role === "editor" ? (
              <li>
                <a href="/jobs/new">New job</a>
              </li>
            ) : null}
          </ul>
        </nav>
        <div className="account">
          <p>{account.role === "editor" ? "Editor" : "Viewer"}</p>
          <p>Model credits: {account.credits}</p>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>
      {signOutError ? (
        <p role="alert" className="alert wrap">
          {signOutError}
        </p>
      ) : null}
      {account.role === "viewer" ? (
        <p className="banner">You can read the queue. Editors enqueue new drafts.</p>
      ) : null}
      <main id="content" className="wrap">
        {children}
      </main>
      <footer className="wrap footer">Portfolio version. Synthetic workspace.</footer>
    </>
  );
}
