"use client";

import { useState } from "react";

const SESSION_KEY = "ruksak_oauth_test";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Base64Url(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

function randomString(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return toBase64Url(bytes);
}

export function OAuthTestLauncher() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);

    try {
      const origin = window.location.origin;
      const redirectUri = `${origin}/app/access/oauth-test/callback`;
      const state = randomString(18);
      const codeVerifier = randomString(48);
      const codeChallenge = await sha256Base64Url(codeVerifier);

      const registerResponse = await fetch("/oauth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          client_name: "Ruksak OAuth Test Client",
          redirect_uris: [redirectUri],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "client_secret_post",
          scope: "openid email profile mcp:tools"
        })
      });

      if (!registerResponse.ok) {
        throw new Error("Could not register the OAuth test client.");
      }

      const client = await registerResponse.json();

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          client_id: client.client_id,
          client_secret: client.client_secret,
          redirect_uri: redirectUri,
          state,
          code_verifier: codeVerifier
        })
      );

      const authorizeUrl = new URL("/oauth/authorize", origin);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", client.client_id);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("scope", "openid email profile mcp:tools");
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("code_challenge", codeChallenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");
      authorizeUrl.searchParams.set("resource", `${origin}/api/mcp`);

      window.location.assign(authorizeUrl.toString());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "OAuth setup failed.");
      setBusy(false);
    }
  }

  return (
    <div className="cta-row">
      <button className="button" onClick={start} disabled={busy}>
        {busy ? "Starting OAuth flow..." : "Run OAuth End-to-End Test"}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
