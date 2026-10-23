"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, api } from "../lib/api";
import { fill } from "../lib/i18n";
import { useCopy } from "../lib/preferences";
import { accountQuery } from "../lib/queries";
import { HeaderControls } from "./HeaderControls";

export function Shell({ children }: { children: ReactNode }) {
  const copy = useCopy();
  const query = useQuery(accountQuery());
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signOutFailed, setSignOutFailed] = useState(false);

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) router.replace("/login");
  }, [query.error, router]);

  async function signOut(): Promise<void> {
    setSignOutFailed(false);
    try {
      await api("/api/sessions", { method: "DELETE" });
      queryClient.clear();
      router.replace("/login");
    } catch (error) {
      if (error instanceof ApiError) setSignOutFailed(true);
      else setSignOutFailed(true);
    }
  }

  const account = query.data;
  const redirecting = query.error instanceof ApiError && query.error.status === 401;

  let body: ReactNode;
  if (query.isPending) body = <p aria-busy="true">{copy.loadingWorkspace}</p>;
  else if (redirecting) body = <p>{copy.redirecting}</p>;
  else if (query.isError) {
    body = (
      <div role="alert">
        <p>{copy.workspaceError}</p>
        <button type="button" onClick={() => void query.refetch()}>
          {copy.retry}
        </button>
      </div>
    );
  } else body = children;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <a className="wordmark" href="/jobs">
            Draftline
          </a>
          <p className="tagline">{copy.tagline}</p>
        </div>
        <nav aria-label={copy.navLabel}>
          <ul className="nav-list">
            <li>
              <a href="/jobs">{copy.jobs}</a>
            </li>
            <li>
              <a href="/drafts">{copy.drafts}</a>
            </li>
            {account?.role === "editor" ? (
              <li>
                <a href="/jobs/new">{copy.newJob}</a>
              </li>
            ) : null}
          </ul>
        </nav>
        <div className="header-end">
          <HeaderControls />
          {account ? (
            <div className="account">
              <p>{account.role === "editor" ? copy.editor : copy.viewer}</p>
              <p>{fill(copy.credits, { count: account.credits })}</p>
              <button type="button" onClick={() => void signOut()}>
                {copy.signOut}
              </button>
            </div>
          ) : null}
        </div>
      </header>
      {signOutFailed ? (
        <p role="alert" className="alert wrap">
          {copy.signOutError}
        </p>
      ) : null}
      {account?.role === "viewer" ? <p className="banner">{copy.viewerBanner}</p> : null}
      <main id="content" className="wrap">
        {body}
      </main>
      <footer className="wrap footer">{copy.footer}</footer>
    </>
  );
}
