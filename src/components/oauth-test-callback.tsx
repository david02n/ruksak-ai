"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const SESSION_KEY = "ruksak_oauth_test";

type Phase = "exchanging" | "running" | "done" | "error";

type ResultPayload = {
  access_token: string;
  userinfo: Record<string, unknown>;
  smoke: Record<string, unknown>;
};

export function OAuthTestCallback() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("exchanging");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const stored = sessionStorage.getItem(SESSION_KEY);

        if (!code || !state || !stored) {
          throw new Error("Missing OAuth callback state.");
        }

        const sessionData = JSON.parse(stored) as {
          client_id: string;
          client_secret?: string;
          redirect_uri: string;
          state: string;
          code_verifier: string;
        };

        if (sessionData.state !== state) {
          throw new Error("OAuth state mismatch.");
        }

        const tokenResponse = await fetch("/oauth/token", {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: sessionData.client_id,
            client_secret: sessionData.client_secret ?? "",
            redirect_uri: sessionData.redirect_uri,
            code_verifier: sessionData.code_verifier
          })
        });

        const tokenPayload = await tokenResponse.json();

        if (!tokenResponse.ok || typeof tokenPayload.access_token !== "string") {
          throw new Error(tokenPayload.error_description ?? "Token exchange failed.");
        }

        setPhase("running");

        const [userinfoResponse, smokeResponse] = await Promise.all([
          fetch("/oauth/userinfo", {
            headers: {
              Authorization: `Bearer ${tokenPayload.access_token}`
            }
          }),
          fetch("/api/mcp/smoke", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              access_token: tokenPayload.access_token,
              hints: {
                client: "codex",
                request_text: "Open my current Ruksak context and current project."
              }
            })
          })
        ]);

        const userinfoPayload = await userinfoResponse.json();
        const smokePayload = await smokeResponse.json();

        if (!userinfoResponse.ok) {
          throw new Error(userinfoPayload.error_description ?? "userinfo failed");
        }

        if (!smokeResponse.ok) {
          throw new Error(smokePayload.error_description ?? "open_ruksak smoke failed");
        }

        if (!cancelled) {
          setResult({
            access_token: tokenPayload.access_token,
            userinfo: userinfoPayload,
            smoke: smokePayload
          });
          setPhase("done");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "OAuth callback failed.");
          setPhase("error");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (phase === "error") {
    return (
      <article className="card">
        <span className="card-tag">Error</span>
        <h3>OAuth smoke test failed</h3>
        <p>{error}</p>
      </article>
    );
  }

  if (phase !== "done" || !result) {
    return (
      <article className="card">
        <span className="card-tag">Working</span>
        <h3>Running the OAuth + MCP smoke test</h3>
        <p>{phase === "running" ? "Calling open_ruksak..." : "Exchanging OAuth code..."}</p>
      </article>
    );
  }

  return (
    <div className="card-grid single-card-grid">
      <article className="card">
        <span className="card-tag">Success</span>
        <h3>OAuth flow succeeded</h3>
        <p>The browser authorization, token exchange, userinfo call, and authenticated MCP call all completed.</p>
        <code className="inline-code-block">{result.access_token}</code>
      </article>
      <article className="card">
        <span className="card-tag">Userinfo</span>
        <h3>Resolved identity</h3>
        <pre className="inline-code-block">{JSON.stringify(result.userinfo, null, 2)}</pre>
      </article>
      <article className="card">
        <span className="card-tag">open_ruksak</span>
        <h3>MCP response</h3>
        <pre className="inline-code-block">{JSON.stringify(result.smoke, null, 2)}</pre>
      </article>
    </div>
  );
}
