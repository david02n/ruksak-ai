import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { AppShell } from "@/components/app-shell";
import { ensureUserRecord, listMcpTokensForUser } from "@/lib/ruksak-users";

export const dynamic = "force-dynamic";

type AccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const clerkUser = await currentUser();

  if (!clerkUser?.primaryEmailAddress?.emailAddress) {
    return (
      <AppShell
        eyebrow="Access"
        title="You need to sign in first"
        copy="Sign in before creating an MCP access token."
      >
        <div className="cta-row">
          <Link className="button" href="/sign-in">
            Go to sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const user = await ensureUserRecord({
    email: clerkUser.primaryEmailAddress.emailAddress,
    name: clerkUser.fullName,
    image: clerkUser.imageUrl
  });

  if (!user) {
    throw new Error("Could not create or load your Ruksak user.");
  }

  const params = (await searchParams) ?? {};
  const token = typeof params.token === "string" ? params.token : null;
  const tokens = await listMcpTokensForUser(user.id);

  return (
    <AppShell
      eyebrow="MCP access"
      title="Create a Google-backed MCP token"
      copy="Google sign-in is your identity layer. Ruksak uses OAuth for MCP clients, with direct tokens available for advanced use cases."
    >
      {token ? (
        <article className="card">
          <span className="card-tag">Copy once</span>
          <h3>New MCP token</h3>
          <p>Save this token now. For safety, it is only shown on creation.</p>
          <code className="inline-code-block">{token}</code>
        </article>
      ) : null}

      <div className="cta-row">
        {process.env.NODE_ENV !== "production" && (
          <Link className="button" href="/app/access/oauth-test">
            Run OAuth end-to-end test
          </Link>
        )}
        <Link className="button" href="/app/access/new">
          Generate direct access token
        </Link>
        <a className="button-secondary" href="https://www.ruksak.ai/api/mcp">
          MCP endpoint
        </a>
      </div>

      <div className="card-grid single-card-grid">
        <article className="card">
          <span className="card-tag">Connect</span>
          <h3>Use this endpoint</h3>
          <p>
            <code>https://www.ruksak.ai/api/mcp</code>
          </p>
        </article>
        <article className="card">
          <span className="card-tag">Tokens</span>
          <h3>Issued access</h3>
          <p>{tokens.length ? `${tokens.length} active MCP token(s)` : "No MCP tokens issued yet."}</p>
          <ul>
            {tokens.map((entry) => (
              <li key={entry.id}>
                {entry.label} · created {entry.createdAt.toISOString()}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </AppShell>
  );
}
