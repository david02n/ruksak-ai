"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { captureEvent } from "@/lib/posthog";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="app-nav-button"
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        captureEvent("sign_out_started");
        await signOut({
          callbackUrl: "/"
        });
      }}
    >
      {pending ? "Signing out..." : "Log out"}
    </button>
  );
}
