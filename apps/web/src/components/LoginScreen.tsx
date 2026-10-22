"use client";

import { LoginForm } from "./LoginForm";

export function LoginScreen() {
  return (
    <main id="content" className="login-wrap">
      <div className="card">
        <p className="eyebrow">Workspace</p>
        <h1>Draftline</h1>
        <p>Sign in to read the queue or enqueue a brief.</p>
        <LoginForm />
      </div>
    </main>
  );
}
