import { registerOAuthClient } from "@/lib/oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const client = await registerOAuthClient({
    redirectUris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
    grantTypes: Array.isArray(body.grant_types) ? body.grant_types : undefined,
    responseTypes: Array.isArray(body.response_types) ? body.response_types : undefined,
    tokenEndpointAuthMethod:
      typeof body.token_endpoint_auth_method === "string"
        ? body.token_endpoint_auth_method
        : undefined,
    scope: typeof body.scope === "string" ? body.scope : undefined,
    clientName: typeof body.client_name === "string" ? body.client_name : undefined
  });

  const responseBody: Record<string, unknown> = {
    client_id: client.clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: client.redirectUris,
    grant_types: client.grantTypes,
    response_types: client.responseTypes,
    token_endpoint_auth_method: client.tokenEndpointAuthMethod,
    application_type:
      client.tokenEndpointAuthMethod === "none" ? "native" : "web",
    scope: client.scope
  };

  if (client.clientSecret) {
    responseBody.client_secret = client.clientSecret;
    responseBody.client_secret_expires_at = 0;
  }

  return Response.json(responseBody, { status: 201 });
}
