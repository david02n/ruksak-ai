import { createOpaqueToken, getByRefreshToken, getOAuthClient, mcpAudience, revokeRefreshToken, saveOAuthAccessToken, consumeAuthorizationCode, verifyPkce, baseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    {
      error,
      error_description: description
    },
    { status }
  );
}

function logOAuthEvent(message: string, detail?: Record<string, unknown>) {
  console.info(
    `[ruksak-oauth] ${message}${detail ? ` ${JSON.stringify(detail)}` : ""}`
  );
}

function verboseOAuthLogsEnabled() {
  return process.env.RUKSAK_VERBOSE_AUTH_LOGS === "true";
}

async function bodyFromRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }

  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export async function POST(request: Request) {
  const body = await bodyFromRequest(request);
  const grantType = typeof body.grant_type === "string" ? body.grant_type : undefined;

  if (grantType === "authorization_code") {
    const code = typeof body.code === "string" ? body.code : undefined;
    const redirectUri =
      typeof body.redirect_uri === "string" ? body.redirect_uri : undefined;
    const clientId = typeof body.client_id === "string" ? body.client_id : undefined;
    const clientSecret =
      typeof body.client_secret === "string" ? body.client_secret : undefined;
    const codeVerifier =
      typeof body.code_verifier === "string" ? body.code_verifier : undefined;

    if (!code || !redirectUri || !clientId) {
      return oauthError(
        "invalid_request",
        "code, client_id, and redirect_uri are required."
      );
    }

    const client = await getOAuthClient(clientId);
    if (!client) {
      logOAuthEvent("authorization_code_unknown_client", { clientId });
      return oauthError(
        "invalid_client",
        "Client must be registered before token exchange.",
        401
      );
    }

    const record = await consumeAuthorizationCode(code);
    if (!record) {
      logOAuthEvent("authorization_code_missing_or_consumed", { clientId });
      return oauthError(
        "invalid_grant",
        "Authorization code is invalid or already used."
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      logOAuthEvent("authorization_code_expired", { clientId });
      return oauthError("invalid_grant", "Authorization code has expired.");
    }

    if (record.clientId !== clientId || record.redirectUri !== redirectUri) {
      return oauthError(
        "invalid_grant",
        "Authorization code details do not match."
      );
    }

    if (
      client.tokenEndpointAuthMethod !== "none" &&
      client.clientSecret !== clientSecret
    ) {
      logOAuthEvent("authorization_code_bad_client_secret", {
        clientId,
        tokenEndpointAuthMethod: client.tokenEndpointAuthMethod
      });
      return oauthError("invalid_client", "Client authentication failed.", 401);
    }

    if (record.codeChallengeMethod && record.codeChallengeMethod !== "S256") {
      return oauthError(
        "invalid_grant",
        "Unsupported PKCE code_challenge_method."
      );
    }

    if (record.codeChallenge) {
      if (!codeVerifier) {
        logOAuthEvent("authorization_code_missing_pkce_verifier", { clientId });
        return oauthError(
          "invalid_request",
          "code_verifier is required for PKCE."
        );
      }

      if (!verifyPkce(codeVerifier, record.codeChallenge)) {
        logOAuthEvent("authorization_code_pkce_failed", { clientId });
        return oauthError("invalid_grant", "PKCE verification failed.");
      }
    } else if (client.tokenEndpointAuthMethod === "none") {
      return oauthError(
        "invalid_grant",
        "PKCE verification is required for public clients."
      );
    }

    const accessToken = createOpaqueToken(24);
    const refreshToken = createOpaqueToken(24);
    const expiresIn = 3600;

    await saveOAuthAccessToken({
      accessToken,
      clientId,
      userId: record.userId,
      scope: record.scope,
      audience: record.resource ?? mcpAudience(),
      issuer: baseUrl(),
      subject: record.userId,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    });

    if (verboseOAuthLogsEnabled()) {
      logOAuthEvent("authorization_code_issued_access_token", {
        clientId,
        scope: record.scope,
        audience: record.resource ?? mcpAudience()
      });
    }

    return Response.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: record.scope
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken =
      typeof body.refresh_token === "string" ? body.refresh_token : undefined;
    const clientId = typeof body.client_id === "string" ? body.client_id : undefined;
    const clientSecret =
      typeof body.client_secret === "string" ? body.client_secret : undefined;

    if (!refreshToken || !clientId) {
      return oauthError(
        "invalid_request",
        "refresh_token and client_id are required."
      );
    }

    const client = await getOAuthClient(clientId);
    if (!client) {
      logOAuthEvent("refresh_unknown_client", { clientId });
      return oauthError(
        "invalid_client",
        "Client must be registered before token refresh.",
        401
      );
    }

    const stored = await getByRefreshToken(refreshToken);
    if (!stored || stored.clientId !== clientId) {
      logOAuthEvent("refresh_invalid_token", { clientId });
      return oauthError("invalid_grant", "Refresh token is invalid.");
    }

    if (
      client.tokenEndpointAuthMethod !== "none" &&
      client.clientSecret !== clientSecret
    ) {
      logOAuthEvent("refresh_bad_client_secret", { clientId });
      return oauthError("invalid_client", "Client authentication failed.", 401);
    }

    const nextAccessToken = createOpaqueToken(24);
    const nextRefreshToken = createOpaqueToken(24);
    const expiresIn = 3600;

    await revokeRefreshToken(refreshToken);
    await saveOAuthAccessToken({
      accessToken: nextAccessToken,
      clientId,
      userId: stored.userId,
      scope: stored.scope,
      audience: stored.audience,
      issuer: stored.issuer,
      subject: stored.subject,
      refreshToken: nextRefreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    });

    if (verboseOAuthLogsEnabled()) {
      logOAuthEvent("refresh_issued_access_token", {
        clientId,
        scope: stored.scope,
        audience: stored.audience
      });
    }

    return Response.json({
      access_token: nextAccessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: nextRefreshToken,
      scope: stored.scope
    });
  }

  return oauthError("unsupported_grant_type", "Unsupported grant_type.");
}
