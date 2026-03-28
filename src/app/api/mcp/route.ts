import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { baseUrl, getOAuthAccessToken } from "@/lib/oauth";
import { authenticateMcpToken } from "@/lib/ruksak-users";
import {
  AUTH_REASON_CODES,
  type AuthDiagnostic,
  validateMcpOAuthToken
} from "@/mcp/auth";
import { captureRequestShape } from "@/mcp/request-shape";
import { createSessionBoundRuksakMcpServer } from "@/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers":
    "authorization, content-type, accept, last-event-id, mcp-protocol-version, mcp-session-id",
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version"
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  });
}

function unauthorizedResponse() {
  const resourceMetadata = `${baseUrl()}/.well-known/oauth-protected-resource/mcp`;

  return withCors(
    Response.json(
      {
        error: "Unauthorized"
      },
      {
        status: 401,
        headers: {
          "www-authenticate": `Bearer realm="ruksak-mcp", resource_metadata="${resourceMetadata}", scope="mcp:tools"`
        }
      }
    )
  );
}

function logAuthEvent(event: string, detail?: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      component: "ruksak-mcp-auth",
      event,
      ...detail
    })
  );
}

function verboseAuthLogsEnabled() {
  return process.env.RUKSAK_VERBOSE_AUTH_LOGS === "true";
}

function requestContext(request: Request) {
  return {
    path: new URL(request.url).pathname,
    method: request.method
  };
}

async function getAuthenticatedMcpSession(request: Request) {
  const context = requestContext(request);
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    await captureRequestShape(request, {
      authOutcome: "rejected",
      reasonCode: AUTH_REASON_CODES.MISSING_BEARER
    });
    logAuthEvent("auth_rejected", {
      ...context,
      reasonCode: AUTH_REASON_CODES.MISSING_BEARER
    });
    return null;
  }

  const providedToken = authorization.slice("Bearer ".length).trim();
  const oauthToken = await getOAuthAccessToken(providedToken);

  if (oauthToken) {
    const diagnostic = validateMcpOAuthToken({
      clientId: oauthToken.clientId,
      clientName: oauthToken.clientName,
      userId: oauthToken.userId,
      scope: oauthToken.scope,
      audience: oauthToken.audience,
      issuer: oauthToken.issuer,
      subject: oauthToken.subject,
      expiresAt: oauthToken.expiresAt,
      revokedAt: oauthToken.revokedAt
    });

    if (!diagnostic.ok) {
      await captureRequestShape(request, {
        userId: oauthToken.userId,
        clientKey: oauthToken.clientId,
        authOutcome: "rejected",
        reasonCode: diagnostic.reasonCode
      });
      logAuthEvent("auth_rejected", {
        ...context,
        ...redactDiagnostic(diagnostic)
      });
      return null;
    }

    if (verboseAuthLogsEnabled()) {
      logAuthEvent("auth_accepted", {
        ...context,
        ...redactDiagnostic(diagnostic)
      });
    }

    await captureRequestShape(request, {
      userId: oauthToken.userId,
      clientKey: oauthToken.clientId,
      authOutcome: "accepted",
      reasonCode: null
    });

    return {
      userId: oauthToken.userId,
      clientKey: oauthToken.clientId,
      clientLabel: oauthToken.clientName ?? oauthToken.clientId,
      transportType: "streamable_http" as const
    };
  }

  const fallback = await authenticateMcpToken(providedToken);

  if (!fallback) {
    await captureRequestShape(request, {
      authOutcome: "rejected",
      reasonCode: AUTH_REASON_CODES.TOKEN_NOT_FOUND
    });
    logAuthEvent("auth_rejected", {
      ...context,
      reasonCode: AUTH_REASON_CODES.TOKEN_NOT_FOUND
    });
    return null;
  }

  if (verboseAuthLogsEnabled()) {
    logAuthEvent("auth_accepted_fallback", {
      ...context,
      clientLabel: fallback.label
    });
  }

  await captureRequestShape(request, {
    userId: fallback.userId,
    clientKey: fallback.label,
    authOutcome: "accepted_fallback",
    reasonCode: null
  });

  return {
    userId: fallback.userId,
    clientKey: fallback.label,
    clientLabel: fallback.label,
    transportType: "streamable_http" as const
  };
}

async function handle(request: Request) {
  if (verboseAuthLogsEnabled()) {
    logAuthEvent("incoming_request", {
      ...requestContext(request),
      protocolVersion: request.headers.get("mcp-protocol-version"),
      userAgent: request.headers.get("user-agent")
    });
  }

  const session = await getAuthenticatedMcpSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createSessionBoundRuksakMcpServer(session);

  await server.connect(transport);

  const response = await transport.handleRequest(request);

  return withCors(response);
}

function redactDiagnostic(diagnostic: AuthDiagnostic) {
  return {
    reasonCode: diagnostic.reasonCode,
    issuer: diagnostic.issuer,
    audience: diagnostic.audience,
    clientId: diagnostic.clientId,
    subjectPresent: diagnostic.subjectPresent,
    scopes: diagnostic.scopes,
    resource: diagnostic.resource,
    expiresAt: diagnostic.expiresAt,
    notBefore: diagnostic.notBefore,
    acceptedAudiences: diagnostic.acceptedAudiences
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}
