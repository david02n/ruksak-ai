"use client";

import { useState, useTransition } from "react";
import { captureEvent } from "@/lib/posthog";

type SignupFormProps = {
  callbackUrl?: string;
};

export function SignupForm({ callbackUrl }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);

        startTransition(async () => {
          captureEvent("email_signup_started");
          const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              name,
              email,
              password,
              callbackUrl
            })
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            captureEvent("email_signup_failed", {
              error: payload.error ?? "unknown"
            });
            setError(payload.error ?? "Could not create your account.");
            return;
          }

          captureEvent("email_signup_succeeded");
          window.location.href = payload.redirectTo ?? callbackUrl ?? "/app";
        });
      }}
    >
      <label className="auth-field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />
      </label>
      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-success">{message}</p> : null}
      <button className="button-secondary auth-submit" disabled={pending} type="submit">
        {pending ? "Creating account..." : "Create email account"}
      </button>
    </form>
  );
}
