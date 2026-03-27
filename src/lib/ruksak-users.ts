import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

import { getDb } from "@/db/client";
import {
  authIdentities,
  mcpAccessTokens,
  passwordCredentials,
  users
} from "@/db/schema";

type UserIdentityInput = {
  email: string;
  name?: string | null;
  image?: string | null;
};

export function hashMcpToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureUserRecord(input: UserIdentityInput) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.primaryEmail, normalizedEmail))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(users)
    .values({
      primaryEmail: normalizedEmail,
      displayName: input.name ?? null,
      imageUrl: input.image ?? null
    })
    .returning();

  return created ?? null;
}

export async function ensureAuthIdentity(input: {
  userId: string;
  provider: string;
  providerUserId: string;
  email?: string | null;
}) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(authIdentities)
    .where(
      and(
        eq(authIdentities.provider, input.provider),
        eq(authIdentities.providerUserId, input.providerUserId)
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(authIdentities)
    .values({
      userId: input.userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      email: input.email ?? null
    })
    .returning();

  return created ?? null;
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const derived = hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(expectedHash, "hex"));
}

export async function createPasswordCredential(input: {
  email: string;
  password: string;
  name?: string | null;
}) {
  const db = getDb();

  if (!db) {
    throw new Error("Database is not configured.");
  }

  const user = await ensureUserRecord({
    email: input.email,
    name: input.name ?? null
  });

  if (!user) {
    throw new Error("Could not create user.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);

  const [existingCredential] = await db
    .select()
    .from(passwordCredentials)
    .where(eq(passwordCredentials.userId, user.id))
    .limit(1);

  if (existingCredential) {
    throw new Error("A password login already exists for this user.");
  }

  await db.insert(passwordCredentials).values({
    userId: user.id,
    passwordHash
  });

  await ensureAuthIdentity({
    userId: user.id,
    provider: "credentials",
    providerUserId: normalizedEmail,
    email: normalizedEmail
  });

  return user;
}

export async function authenticatePasswordUser(email: string, password: string) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const [record] = await db
    .select({
      user: users,
      passwordHash: passwordCredentials.passwordHash
    })
    .from(users)
    .innerJoin(passwordCredentials, eq(passwordCredentials.userId, users.id))
    .where(eq(users.primaryEmail, normalizedEmail))
    .limit(1);

  if (!record) {
    return null;
  }

  if (!verifyPassword(password, record.passwordHash)) {
    return null;
  }

  return record.user;
}

export async function listMcpTokensForUser(userId: string) {
  const db = getDb();

  if (!db) {
    return [];
  }

  return db
    .select({
      id: mcpAccessTokens.id,
      label: mcpAccessTokens.label,
      createdAt: mcpAccessTokens.createdAt,
      lastUsedAt: mcpAccessTokens.lastUsedAt
    })
    .from(mcpAccessTokens)
    .where(and(eq(mcpAccessTokens.userId, userId), isNull(mcpAccessTokens.revokedAt)))
    .orderBy(desc(mcpAccessTokens.createdAt));
}

export async function createMcpTokenForUser(userId: string, label: string) {
  const db = getDb();

  if (!db) {
    throw new Error("Database is not configured.");
  }

  const rawToken = `ruksak_${randomBytes(24).toString("hex")}`;

  const [created] = await db
    .insert(mcpAccessTokens)
    .values({
      userId,
      label,
      tokenHash: hashMcpToken(rawToken)
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create MCP token.");
  }

  return {
    id: created.id,
    token: rawToken,
    label: created.label
  };
}

export async function authenticateMcpToken(rawToken: string) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const tokenHash = hashMcpToken(rawToken.trim());

  const [match] = await db
    .select({
      id: mcpAccessTokens.id,
      userId: mcpAccessTokens.userId,
      label: mcpAccessTokens.label,
      revokedAt: mcpAccessTokens.revokedAt
    })
    .from(mcpAccessTokens)
    .where(eq(mcpAccessTokens.tokenHash, tokenHash))
    .limit(1);

  if (!match || match.revokedAt) {
    return null;
  }

  await db
    .update(mcpAccessTokens)
    .set({
      lastUsedAt: new Date()
    })
    .where(eq(mcpAccessTokens.id, match.id));

  return match;
}
