import { redirect } from "next/navigation";

import { requireSignedInUser, getOAuthClient, saveAuthorizationCode } from "@/lib/oauth";

export const runtime = "nodejs";

function errorResponse(error: string, description: string, status = 400) {
  return Response.json(
    {
      error,
      error_description: description
    },
    { status }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const scope = url.searchParams.get("scope") ?? "openid email profile mcp:tools";
  const state = url.searchParams.get("state");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const resource = url.searchParams.get("resource");

  if (responseType !== "code") {
    return errorResponse(
      "unsupported_response_type",
      "Only authorization code flow is supported."
    );
  }

  if (!clientId || !redirectUri) {
    return errorResponse("invalid_request", "client_id and redirect_uri are required.");
  }

  const client = await getOAuthClient(clientId);

  if (!client) {
    return errorResponse(
      "invalid_client",
      "Client must be registered before authorization.",
      401
    );
  }

  if (!client.redirectUris.includes(redirectUri)) {
    return errorResponse(
      "invalid_request",
      "redirect_uri is not registered for this client."
    );
  }

  if (client.tokenEndpointAuthMethod === "none") {
    if (!codeChallenge) {
      return errorResponse(
        "invalid_request",
        "code_challenge is required for public clients."
      );
    }

    if (codeChallengeMethod !== "S256") {
      return errorResponse(
        "invalid_request",
        "code_challenge_method must be S256."
      );
    }
  }

  const signedInUser = await requireSignedInUser();

  if (!signedInUser) {
    const returnTo = `${url.pathname}${url.search}`;
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const code = await saveAuthorizationCode({
    clientId,
    redirectUri,
    scope,
    userId: signedInUser.id,
    codeChallenge: codeChallenge ?? undefined,
    codeChallengeMethod: codeChallengeMethod ?? undefined,
    resource: resource ?? undefined,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  const redirectTarget = new URL(redirectUri);
  redirectTarget.searchParams.set("code", code);
  if (state) {
    redirectTarget.searchParams.set("state", state);
  }

  redirect(redirectTarget.toString());
}
