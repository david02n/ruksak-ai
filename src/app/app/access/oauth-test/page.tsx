import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { OAuthTestLauncher } from "@/components/oauth-test-launcher";

export const dynamic = "force-dynamic";

export default function OAuthTestPage() {
  // Hard block in production - return 404
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AppShell
      eyebrow="OAuth smoke test"
      title="Run the real OAuth-to-MCP flow"
      copy="This path registers a public OAuth client, sends you through authorization, exchanges the code with PKCE, and then calls open_ruksak against the live MCP endpoint."
    >
      <article className="card">
        <span className="card-tag">End to end</span>
        <h3>What this verifies</h3>
        <p>Client registration, browser authorization, token exchange, userinfo, and a real authenticated MCP call to open_ruksak.</p>
      </article>
      <OAuthTestLauncher />
    </AppShell>
  );
}
