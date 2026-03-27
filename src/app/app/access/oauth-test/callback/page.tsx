import { Suspense } from "react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { OAuthTestCallback } from "@/components/oauth-test-callback";

export const dynamic = "force-dynamic";

export default function OAuthTestCallbackPage() {
  // Hard block in production - return 404
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AppShell
      eyebrow="OAuth callback"
      title="Finishing the Ruksak OAuth flow"
      copy="Ruksak is exchanging the authorization code and then calling open_ruksak with the issued token."
    >
      <Suspense
        fallback={
          <article className="card">
            <span className="card-tag">Working</span>
            <h3>Preparing callback</h3>
            <p>Loading OAuth callback state...</p>
          </article>
        }
      >
        <OAuthTestCallback />
      </Suspense>
    </AppShell>
  );
}
