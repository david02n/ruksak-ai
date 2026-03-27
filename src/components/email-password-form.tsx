"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { captureEvent } from "@/lib/posthog";

type EmailPasswordFormProps = {
  callbackUrl?: string;
};

export function EmailPasswordForm({ callbackUrl }: EmailPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        startTransition(async () => {
          captureEvent("email_sign_in_started");
          const result = await signIn("credentials", {
            email,
            password,
            callbackUrl: callbackUrl || "/app",
            redirect: false
          });

          if (result?.error) {
            captureEvent("email_sign_in_failed");
            setError("Email or password did not match.");
            return;
          }

          captureEvent("email_sign_in_succeeded");
          window.location.href = result?.url ?? callbackUrl ?? "/app";
        });
      }}
    >
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
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <button className="button-secondary auth-submit" disabled={pending} type="submit">
        {pending ? "Signing in..." : "Sign in with email"}
      </button>
    </form>
  );
}
