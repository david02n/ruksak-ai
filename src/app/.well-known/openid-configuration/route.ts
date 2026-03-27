import { baseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET() {
  const origin = baseUrl();

  return Response.json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    userinfo_endpoint: `${origin}/oauth/userinfo`,
    scopes_supported: ["openid", "profile", "email", "mcp:tools"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    code_challenge_methods_supported: ["S256"],
    subject_types_supported: ["public"],
    claims_supported: ["sub", "email", "name", "picture"]
  });
}
