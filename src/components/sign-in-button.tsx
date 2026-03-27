"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { captureEvent } from "@/lib/posthog";

type SignInButtonProps = {
  label?: string;
  callbackUrl?: string;
};

export function SignInButton({
  label = "Continue with Google",
  callbackUrl
}: SignInButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="button"
      type="button"
      onClick={async () => {
        setPending(true);
        captureEvent("google_sign_in_started", {
          callback_url: callbackUrl ?? "/app/access/oauth-test"
        });
        await signIn("google", {
          callbackUrl: callbackUrl ?? "/app/access/oauth-test"
        });
      }}
      disabled={pending}
    >
      {pending ? "Redirecting..." : label}
    </button>
  );
}
