import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { OAuthTestCallback } from "@/components/oauth-test-callback";

export const dynamic = "force-dynamic";

export default function OAuthTestCallbackPage() {
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
