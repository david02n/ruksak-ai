import "server-only";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  changeEvents,
  entities,
  proposedUpdateItems,
  proposedUpdates,
  users
} from "@/db/schema";

const FALLBACK_EMAIL = process.env.RUKSAK_OWNER_EMAIL ?? "founder@ruksak.ai";
const FALLBACK_NAME = process.env.RUKSAK_OWNER_NAME ?? "Ruksak Founder";

type EntityRow = InferSelectModel<typeof entities>;
type ProposedUpdateRow = InferSelectModel<typeof proposedUpdates>;
type ChangeEventRow = InferSelectModel<typeof changeEvents>;

export type SearchResult = {
  kind: "entity" | "proposed_update" | "change_event";
  id: string;
  title: string;
  summary: string;
  scoreLabel: string;
};

export type FetchResult =
  | {
      kind: "entity";
      id: string;
      title: string;
      summary: string | null;
      payload: Record<string, unknown>;
      updatedAt: string;
    }
  | {
      kind: "proposed_update";
      id: string;
      title: string;
      summary: string;
      payload: Record<string, unknown>;
      updatedAt: string;
    }
  | {
      kind: "change_event";
      id: string;
      title: string;
      summary: string;
      payload: Record<string, unknown>;
      updatedAt: string;
    };

function asIsoString(value: Date | null) {
  return value ? value.toISOString() : "";
}

async function ensurePrimaryUser() {
  const db = getDb();

  if (!db) {
    return null;
  }

  const existing = await db
    .select()
    .from(users)
    .orderBy(asc(users.createdAt))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const [created] = await db
    .insert(users)
    .values({
      displayName: FALLBACK_NAME,
      primaryEmail: FALLBACK_EMAIL
    })
    .returning();

  return created ?? null;
}

function fallbackCurrentContext() {
  return {
    profile: {
      name: FALLBACK_NAME,
      email: FALLBACK_EMAIL
    },
    currentWork: [
      "Launch Ruksak as an MCP-first context service",
      "Use a review-first durable context model",
      "Keep web UI as a secondary control surface"
    ],
    activeProjects: ["Sunday launch", "Remote MCP server", "Durable context foundation"],
    pendingReviewCount: 0,
    recentChangeCount: 0,
    source: "fallback"
  };
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function getCurrentContext(userId?: string) {
  const db = getDb();

  if (!db) {
    return fallbackCurrentContext();
  }

  const user = userId
    ? (
        await db.select().from(users).where(eq(users.id, userId)).limit(1)
      )[0] ?? null
    : await ensurePrimaryUser();

  if (!user) {
    return fallbackCurrentContext();
  }

  const [activeEntities, pendingReview, recentChanges] = await Promise.all([
    db
      .select({
        id: entities.id,
        title: entities.title,
        entityType: entities.entityType,
        summary: entities.summary,
        updatedAt: entities.updatedAt
      })
      .from(entities)
      .where(and(eq(entities.userId, user.id), eq(entities.status, "active")))
      .orderBy(desc(entities.updatedAt))
      .limit(8),
    db
      .select({
        id: proposedUpdates.id
      })
      .from(proposedUpdates)
      .where(and(eq(proposedUpdates.userId, user.id), eq(proposedUpdates.status, "pending")))
      .limit(50),
    db
      .select({
        id: changeEvents.id,
        actionType: changeEvents.actionType,
        createdAt: changeEvents.createdAt
      })
      .from(changeEvents)
      .where(eq(changeEvents.userId, user.id))
      .orderBy(desc(changeEvents.createdAt))
      .limit(10)
  ]);

  return {
    profile: {
      name: user.displayName ?? FALLBACK_NAME,
      email: user.primaryEmail
    },
    currentWork: activeEntities.slice(0, 3).map((entity) => entity.title),
    activeProjects: activeEntities
      .filter((entity) => entity.entityType === "project")
      .slice(0, 5)
      .map((entity) => entity.title),
    topEntities: activeEntities.map((entity) => ({
      id: entity.id,
      title: entity.title,
      entityType: entity.entityType,
      summary: entity.summary,
      updatedAt: asIsoString(entity.updatedAt)
    })),
    pendingReviewCount: pendingReview.length,
    recentChangeCount: recentChanges.length,
    source: "database"
  };
}

export async function searchRuksak(query: string, entityType?: string, userId?: string) {
  const trimmedQuery = normalizeText(query);

  if (!trimmedQuery) {
    return [];
  }

  const db = getDb();

  if (!db) {
    return [
      {
        kind: "entity" as const,
        id: "fallback-launch",
        title: "Launch Ruksak",
        summary: "Fallback context is active because the database is not configured.",
        scoreLabel: "fallback"
      }
    ];
  }

  const user = userId
    ? (
        await db.select().from(users).where(eq(users.id, userId)).limit(1)
      )[0] ?? null
    : await ensurePrimaryUser();

  if (!user) {
    return [];
  }

  const entityConditions = [
    ilike(entities.title, `%${trimmedQuery}%`),
    ilike(entities.summary, `%${trimmedQuery}%`)
  ];

  const matchedEntities = await db
    .select({
      id: entities.id,
      title: entities.title,
      summary: entities.summary,
      entityType: entities.entityType
    })
    .from(entities)
    .where(
      and(
        eq(entities.userId, user.id),
        eq(entities.status, "active"),
        entityType ? eq(entities.entityType, entityType) : undefined,
        or(...entityConditions)
      )
    )
    .orderBy(desc(entities.updatedAt))
    .limit(8);

  const matchedUpdates = await db
    .select({
      id: proposedUpdates.id,
      summary: proposedUpdates.summary,
      updateType: proposedUpdates.updateType,
      status: proposedUpdates.status
    })
    .from(proposedUpdates)
    .where(
      and(
        eq(proposedUpdates.userId, user.id),
        ilike(proposedUpdates.summary, `%${trimmedQuery}%`)
      )
    )
    .orderBy(desc(proposedUpdates.createdAt))
    .limit(5);

  const matchedChanges = await db
    .select({
      id: changeEvents.id,
      actionType: changeEvents.actionType,
      actorLabel: changeEvents.actorLabel,
      originSurface: changeEvents.originSurface
    })
    .from(changeEvents)
    .where(
      and(
        eq(changeEvents.userId, user.id),
        or(
          ilike(changeEvents.actionType, `%${trimmedQuery}%`),
          ilike(changeEvents.actorLabel, `%${trimmedQuery}%`),
          ilike(changeEvents.originSurface, `%${trimmedQuery}%`)
        )
      )
    )
    .orderBy(desc(changeEvents.createdAt))
    .limit(5);

  const results: SearchResult[] = [
    ...matchedEntities.map((entity) => ({
      kind: "entity" as const,
      id: entity.id,
      title: entity.title,
      summary: entity.summary ?? `${entity.entityType} in durable context`,
      scoreLabel: "durable"
    })),
    ...matchedUpdates.map((update) => ({
      kind: "proposed_update" as const,
      id: update.id,
      title: `${update.updateType} update`,
      summary: update.summary,
      scoreLabel: update.status
    })),
    ...matchedChanges.map((change) => ({
      kind: "change_event" as const,
      id: change.id,
      title: `${change.actionType} event`,
      summary: `${change.actorLabel ?? "unknown actor"} via ${change.originSurface ?? "unknown surface"}`,
      scoreLabel: "history"
    }))
  ];

  return results;
}

function buildFetchResultFromEntity(entity: EntityRow): FetchResult {
  return {
    kind: "entity",
    id: entity.id,
    title: entity.title,
    summary: entity.summary,
    payload: entity.data,
    updatedAt: asIsoString(entity.updatedAt)
  };
}

function buildFetchResultFromProposedUpdate(
  update: ProposedUpdateRow,
  items: Array<InferSelectModel<typeof proposedUpdateItems>>
): FetchResult {
  return {
    kind: "proposed_update",
    id: update.id,
    title: `${update.updateType} update`,
    summary: update.summary,
    payload: {
      status: update.status,
      confidence: update.confidence,
      items: items.map((item) => ({
        id: item.id,
        actionKind: item.actionKind,
        candidateEntity: item.candidateEntity,
        before: item.before,
        after: item.after
      }))
    },
    updatedAt: asIsoString(update.createdAt)
  };
}

function buildFetchResultFromChangeEvent(change: ChangeEventRow): FetchResult {
  return {
    kind: "change_event",
    id: change.id,
    title: `${change.actionType} event`,
    summary: `${change.actorLabel ?? "unknown actor"} via ${change.originSurface ?? "unknown surface"}`,
    payload: {
      actorType: change.actorType,
      actorLabel: change.actorLabel,
      originSurface: change.originSurface,
      requestId: change.requestId,
      before: change.before,
      after: change.after
    },
    updatedAt: asIsoString(change.createdAt)
  };
}

export async function fetchRuksakItem(kind: FetchResult["kind"], id: string, userId?: string) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const user = userId
    ? (
        await db.select().from(users).where(eq(users.id, userId)).limit(1)
      )[0] ?? null
    : await ensurePrimaryUser();

  if (!user) {
    return null;
  }

  if (kind === "entity") {
    const [entity] = await db
      .select()
      .from(entities)
      .where(and(eq(entities.userId, user.id), eq(entities.id, id)))
      .limit(1);

    return entity ? buildFetchResultFromEntity(entity) : null;
  }

  if (kind === "proposed_update") {
    const [update] = await db
      .select()
      .from(proposedUpdates)
      .where(and(eq(proposedUpdates.userId, user.id), eq(proposedUpdates.id, id)))
      .limit(1);

    if (!update) {
      return null;
    }

    const items = await db
      .select()
      .from(proposedUpdateItems)
      .where(eq(proposedUpdateItems.proposedUpdateId, update.id));

    return buildFetchResultFromProposedUpdate(update, items);
  }

  const [change] = await db
    .select()
    .from(changeEvents)
    .where(and(eq(changeEvents.userId, user.id), eq(changeEvents.id, id)))
    .limit(1);

  return change ? buildFetchResultFromChangeEvent(change) : null;
}

export async function rememberContext(input: {
  userId?: string;
  entityType: string;
  title: string;
  summary: string;
  data?: Record<string, unknown>;
}) {
  const db = getDb();

  if (!db) {
    return {
      mode: "fallback",
      message:
        "Database is not configured yet, so Ruksak cannot persist this context durably."
    };
  }

  const user = input.userId
    ? (
        await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
      )[0] ?? null
    : await ensurePrimaryUser();

  if (!user) {
    throw new Error("Could not resolve a primary Ruksak user.");
  }

  const normalizedTitle = normalizeText(input.title);
  const normalizedSummary = normalizeText(input.summary);

  const [update] = await db
    .insert(proposedUpdates)
    .values({
      userId: user.id,
      status: "pending",
      updateType: input.entityType,
      summary: normalizedSummary,
      confidence: 80,
      sourceSessionId: "mcp"
    })
    .returning();

  await db.insert(proposedUpdateItems).values({
    proposedUpdateId: update.id,
    actionKind: "create",
    candidateEntity: {
      entityType: input.entityType,
      title: normalizedTitle,
      summary: normalizedSummary,
      data: input.data ?? {}
    },
    after: {
      entityType: input.entityType,
      title: normalizedTitle,
      summary: normalizedSummary,
      data: input.data ?? {}
    }
  });

  await db.insert(changeEvents).values({
    userId: user.id,
    proposedUpdateId: update.id,
    actionType: "proposed_update_created",
    actorType: "mcp_client",
    actorLabel: "Ruksak MCP",
    originSurface: "mcp",
    after: {
      entityType: input.entityType,
      title: normalizedTitle,
      summary: normalizedSummary
    }
  });

  return {
    mode: "database",
    proposedUpdateId: update.id,
    status: update.status,
    summary: normalizedSummary
  };
}

export async function recentChanges(limit = 5) {
  const db = getDb();

  if (!db) {
    return [];
  }

  const user = await ensurePrimaryUser();

  if (!user) {
    return [];
  }

  const changes = await db
    .select({
      id: changeEvents.id,
      actionType: changeEvents.actionType,
      actorLabel: changeEvents.actorLabel,
      originSurface: changeEvents.originSurface,
      createdAt: changeEvents.createdAt
    })
    .from(changeEvents)
    .where(eq(changeEvents.userId, user.id))
    .orderBy(desc(changeEvents.createdAt))
    .limit(limit);

  return changes.map((change) => ({
    id: change.id,
    actionType: change.actionType,
    actorLabel: change.actorLabel,
    originSurface: change.originSurface,
    createdAt: asIsoString(change.createdAt)
  }));
}

export async function recentChangesForUser(userId: string, limit = 5) {
  const db = getDb();

  if (!db) {
    return [];
  }

  const changes = await db
    .select({
      id: changeEvents.id,
      actionType: changeEvents.actionType,
      actorLabel: changeEvents.actorLabel,
      originSurface: changeEvents.originSurface,
      createdAt: changeEvents.createdAt
    })
    .from(changeEvents)
    .where(eq(changeEvents.userId, userId))
    .orderBy(desc(changeEvents.createdAt))
    .limit(limit);

  return changes.map((change) => ({
    id: change.id,
    actionType: change.actionType,
    actorLabel: change.actorLabel,
    originSurface: change.originSurface,
    createdAt: asIsoString(change.createdAt)
  }));
}
