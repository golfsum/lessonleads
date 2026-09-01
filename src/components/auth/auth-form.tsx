"use client";

import Link from "next/link";
import { useState } from "react";

export function AuthForm({ mode, demoMode }: { mode: "login" | "signup"; demoMode: boolean }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }
    window.location.assign(body.redirectTo ?? "/dashboard");
  }

  return (
    <div className="auth-card">
      <div className="auth-card-heading">
        <h1>{mode === "signup" ? "Build your widget" : "Welcome back"}</h1>
        <p>{mode === "signup" ? "Start free. No credit card required." : "Sign in to manage your widget and leads."}</p>
      </div>
      {demoMode ? (
        <form action="/api/auth/demo" method="post">
          <input name="fresh" type="hidden" value={mode === "signup" ? "true" : "false"} />
          <button className="button button-primary button-full" type="submit">
            {mode === "signup" ? "Start a fresh demo setup" : "Open the demo workspace"}
          </button>
        </form>
      ) : null}
      {demoMode ? <div className="auth-divider"><span>Production account</span></div> : null}
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" ? (
          <label>Full name<input autoComplete="name" name="name" required type="text" /></label>
        ) : null}
        <label>Email<input autoComplete="email" name="email" required type="email" /></label>
        <label>Password<input autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} name="password" required type="password" /></label>
        {mode === "login" ? <Link className="form-link" href="/forgot-password">Forgot password?</Link> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button button-primary button-full" disabled={pending || demoMode} type="submit">
          {pending ? "Working..." : mode === "signup" ? "Create account" : "Log in"}
        </button>
        {demoMode ? <small className="auth-note">Production signup is disabled in local demo mode. Connect Supabase to enable it.</small> : null}
      </form>
      <p className="auth-switch">
        {mode === "signup" ? "Already have an account?" : "New to LessonLeads?"}{" "}
        <Link href={mode === "signup" ? "/login" : "/signup"}>{mode === "signup" ? "Log in" : "Start free"}</Link>
      </p>
    </div>
  );
}
