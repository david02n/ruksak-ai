"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";
import { captureEvent } from "@/lib/posthog";

export function SignOutButton() {
  return (
    <ClerkSignOutButton>
      <button
        className="button-secondary"
        type="button"
        onClick={() => {
          captureEvent("sign_out_started");
        }}
      >
        Log out
      </button>
    </ClerkSignOutButton>
  );
}
