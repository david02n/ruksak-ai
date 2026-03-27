import "server-only";

import { getDb } from "@/db/client";
import { mcpRequestShapes } from "@/db/schema";

export type CapturedRequestShape = {
  userId?: string | null;
  clientKey?: string | null;
  transportType: string;
  httpMethod: string;
  requestPath: string;
  protocolVersion?: string | null;
  jsonrpcMethod?: string | null;
  toolName?: string | null;
  argumentKeys: string[];
  hasBearer: boolean;
  authOutcome?: string | null;
  reasonCode?: string | null;
  userAgent?: string | null;
  envelopeJson: Record<string, unknown>;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function objectKeys(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.keys(value).sort();
}

export async function captureRequestShape(
  request: Request,
  extras: Partial<Omit<CapturedRequestShape, "transportType" | "httpMethod" | "requestPath" | "argumentKeys" | "hasBearer" | "envelopeJson">> = {}
) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const cloned = request.clone();
  let body: unknown = null;

  if (request.method === "POST") {
    try {
      body = await cloned.json();
    } catch {
      body = null;
    }
  }

  const envelope = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const params =
    envelope && typeof envelope === "object" && "params" in envelope
      ? (envelope as Record<string, unknown>).params
      : undefined;
  const paramsObject =
    params && typeof params === "object" && !Array.isArray(params)
      ? (params as Record<string, unknown>)
      : {};
  const argumentsValue =
    paramsObject.arguments && typeof paramsObject.arguments === "object" && !Array.isArray(paramsObject.arguments)
      ? (paramsObject.arguments as Record<string, unknown>)
      : {};

  const jsonrpcMethod = safeString((envelope as Record<string, unknown>).method);
  const toolName = jsonrpcMethod === "tools/call" ? safeString(paramsObject.name) : null;
  const argumentKeys =
    jsonrpcMethod === "tools/call" ? objectKeys(argumentsValue) : objectKeys(paramsObject);
  const hasBearer = Boolean(request.headers.get("authorization")?.startsWith("Bearer "));

  const storedEnvelope = {
    jsonrpc: safeString((envelope as Record<string, unknown>).jsonrpc),
    method: jsonrpcMethod,
    param_keys: objectKeys(paramsObject),
    argument_keys: objectKeys(argumentsValue),
    has_id: Object.prototype.hasOwnProperty.call(envelope, "id")
  };

  const [created] = await db
    .insert(mcpRequestShapes)
    .values({
      userId: extras.userId ?? null,
      clientKey: extras.clientKey ?? null,
      transportType: "streamable_http",
      httpMethod: request.method,
      requestPath: new URL(request.url).pathname,
      protocolVersion: request.headers.get("mcp-protocol-version"),
      jsonrpcMethod,
      toolName,
      argumentKeys,
      hasBearer,
      authOutcome: extras.authOutcome ?? null,
      reasonCode: extras.reasonCode ?? null,
      userAgent: request.headers.get("user-agent"),
      envelopeJson: storedEnvelope
    })
    .returning();

  return created ?? null;
}
