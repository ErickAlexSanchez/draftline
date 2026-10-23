"use client";

import { useCopy } from "../lib/preferences";
import { HeaderControls } from "./HeaderControls";
import { LoginForm } from "./LoginForm";

export function LoginScreen() {
  const copy = useCopy();
  return (
    <div className="login-page">
      <header className="topbar">
        <div className="brand">
          <p className="wordmark">Draftline</p>
          <p className="tagline">{copy.tagline}</p>
        </div>
        <HeaderControls />
      </header>
      <main id="content" className="login-wrap">
        <div className="card">
          <p className="eyebrow">{copy.navLabel}</p>
          <h1>Draftline</h1>
          <p>{copy.loginLead}</p>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
