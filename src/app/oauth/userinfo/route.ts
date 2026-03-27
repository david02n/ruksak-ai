import { getOAuthAccessToken } from "@/lib/oauth";

export const runtime = "nodejs";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length);
}

export async function GET(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return Response.json(
      {
        error: "invalid_token",
        error_description: "Missing bearer token."
      },
      { status: 401 }
    );
  }

  const record = await getOAuthAccessToken(token);

  if (!record || record.expiresAt.getTime() < Date.now()) {
    return Response.json(
      {
        error: "invalid_token",
        error_description: "Access token is invalid or expired."
      },
      { status: 401 }
    );
  }

  return Response.json({
    sub: record.subject,
    email: record.userEmail,
    name: record.userName,
    picture: record.userImage
  });
}
