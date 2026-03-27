import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { currentUser } from "@clerk/nextjs/server";

import { getDb } from "@/db/client";
import {
  oauthAuthorizationCodes,
  oauthClients,
  oauthTokens,
  users
} from "@/db/schema";
import { resolveTokenEndpointAuthMethod } from "@/lib/oauth-core";
import { ensureUserRecord } from "@/lib/ruksak-users";

const DEFAULT_SCOPE = "openid email profile mcp:tools";

export function baseUrl() {
  return process.env.AUTH_URL ?? "https://www.ruksak.ai";
}

export function mcpAudience() {
  return `${baseUrl()}/api/mcp`;
}

export function createOpaqueToken(size = 32) {
  return randomBytes(size).toString("base64url");
}

export function verifyPkce(codeVerifier: string, codeChallenge: string) {
  const digest = createHash("sha256").update(codeVerifier).digest("base64url");
  return digest === codeChallenge;
}

export async function requireSignedInUser() {
  const clerkUser = await currentUser();

  if (!clerkUser?.primaryEmailAddress?.emailAddress) {
    return null;
  }

  return ensureUserRecord({
    email: clerkUser.primaryEmailAddress.emailAddress,
    name: clerkUser.fullName,
    image: clerkUser.imageUrl
  });
}

export async function registerOAuthClient(input: {
  redirectUris?: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  tokenEndpointAuthMethod?: string;
  scope?: string;
  clientName?: string;
}) {
  const db = getDb();

  if (!db) {
    throw new Error("Database is not configured.");
  }

  const requestedAuthMethod = input.tokenEndpointAuthMethod;
  const tokenEndpointAuthMethod = resolveTokenEndpointAuthMethod({
    requestedAuthMethod,
    redirectUris: input.redirectUris
  });
  const clientId = createOpaqueToken(16);
  const clientSecret =
    tokenEndpointAuthMethod === "none" ? null : createOpaqueToken(24);

  const [client] = await db
    .insert(oauthClients)
    .values({
      clientId,
      clientSecret,
      redirectUris: input.redirectUris ?? [],
      grantTypes: input.grantTypes ?? ["authorization_code", "refresh_token"],
      responseTypes: input.responseTypes ?? ["code"],
      tokenEndpointAuthMethod,
      scope: input.scope ?? DEFAULT_SCOPE,
      clientName: input.clientName ?? "Ruksak MCP client"
    })
    .returning();

  return client;
}

export async function getOAuthClient(clientId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [client] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);

  return client ?? null;
}

export async function saveAuthorizationCode(input: {
  clientId: string;
  redirectUri: string;
  scope: string;
  userId: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
  expiresAt: Date;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("Database is not configured.");
  }

  const code = createOpaqueToken(24);

  await db.insert(oauthAuthorizationCodes).values({
    code,
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    scope: input.scope,
    userId: input.userId,
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: input.codeChallengeMethod,
    resource: input.resource,
    expiresAt: input.expiresAt
  });

  return code;
}

export async function consumeAuthorizationCode(code: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [record] = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.code, code))
    .limit(1);

  if (!record) {
    return null;
  }

  await db
    .delete(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.code, code));

  return record;
}

export async function saveOAuthAccessToken(input: {
  accessToken: string;
  clientId: string;
  userId: string;
  scope: string;
  audience: string;
  issuer: string;
  subject: string;
  refreshToken: string;
  expiresAt: Date;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("Database is not configured.");
  }

  await db
    .delete(oauthTokens)
    .where(eq(oauthTokens.refreshToken, input.refreshToken));

  await db.insert(oauthTokens).values({
    accessToken: input.accessToken,
    clientId: input.clientId,
    userId: input.userId,
    scope: input.scope,
    audience: input.audience,
    issuer: input.issuer,
    subject: input.subject,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt
  });
}

export async function getOAuthAccessToken(accessToken: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [record] = await db
    .select({
      accessToken: oauthTokens.accessToken,
      clientId: oauthTokens.clientId,
      clientName: oauthClients.clientName,
      userId: oauthTokens.userId,
      scope: oauthTokens.scope,
      audience: oauthTokens.audience,
      issuer: oauthTokens.issuer,
      subject: oauthTokens.subject,
      refreshToken: oauthTokens.refreshToken,
      expiresAt: oauthTokens.expiresAt,
      revokedAt: oauthTokens.revokedAt,
      userEmail: users.primaryEmail,
      userName: users.displayName,
      userImage: users.imageUrl
    })
    .from(oauthTokens)
    .innerJoin(oauthClients, eq(oauthTokens.clientId, oauthClients.clientId))
    .innerJoin(users, eq(oauthTokens.userId, users.id))
    .where(and(eq(oauthTokens.accessToken, accessToken), isNull(oauthTokens.revokedAt)))
    .limit(1);

  return record ?? null;
}

export async function getByRefreshToken(refreshToken: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [record] = await db
    .select()
    .from(oauthTokens)
    .where(and(eq(oauthTokens.refreshToken, refreshToken), isNull(oauthTokens.revokedAt)))
    .limit(1);

  return record ?? null;
}

export async function revokeRefreshToken(refreshToken: string) {
  const db = getDb();
  if (!db) {
    return;
  }

  await db
    .update(oauthTokens)
    .set({
      revokedAt: new Date()
    })
    .where(eq(oauthTokens.refreshToken, refreshToken));
}
