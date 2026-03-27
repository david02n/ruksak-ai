import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { auth } from "@/auth";
import { getOAuthAccessToken, baseUrl } from "@/lib/oauth";
import { validateMcpOAuthToken } from "@/mcp/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return Response.json(
      {
        error: "unauthorized",
        error_description: "You must be signed in to run the MCP smoke test."
      },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const accessToken = typeof body.access_token === "string" ? body.access_token : undefined;
  const hints =
    body.hints && typeof body.hints === "object" && !Array.isArray(body.hints)
      ? body.hints
      : {};

  if (!accessToken) {
    return Response.json(
      {
        error: "invalid_request",
        error_description: "access_token is required."
      },
      { status: 400 }
    );
  }

  const record = await getOAuthAccessToken(accessToken);

  if (!record || record.userEmail?.toLowerCase() !== session.user.email.toLowerCase()) {
    return Response.json(
      {
        error: "invalid_token",
        error_description: "Token is invalid for the current signed-in user."
      },
      { status: 401 }
    );
  }

  const authDiagnostic = validateMcpOAuthToken({
    clientId: record.clientId,
    clientName: record.clientName,
    userId: record.userId,
    scope: record.scope,
    audience: record.audience,
    issuer: record.issuer,
    subject: record.subject,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt
  });

  const client = new Client({
    name: "ruksak-oauth-smoke",
    version: "0.1.0"
  });

  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl()}/api/mcp`), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    const result = await client.callTool({
      name: "open_ruksak",
      arguments: hints
    });

    await transport.close();

    return Response.json({
      tools: tools.tools.map((tool) => tool.name),
      auth_diagnostic: {
        ok: authDiagnostic.ok,
        reasonCode: authDiagnostic.reasonCode ?? null,
        issuer: authDiagnostic.issuer,
        audience: authDiagnostic.audience,
        scopes: authDiagnostic.scopes,
        subjectPresent: authDiagnostic.subjectPresent,
        acceptedAudiences: authDiagnostic.acceptedAudiences
      },
      result
    });
  } catch (error) {
    await transport.close().catch(() => undefined);

    return Response.json(
      {
        error: "mcp_smoke_failed",
        error_description: error instanceof Error ? error.message : "Unknown MCP smoke error."
      },
      { status: 500 }
    );
  }
}
