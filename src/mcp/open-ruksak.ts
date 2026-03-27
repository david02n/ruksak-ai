import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  changeEvents,
  contextStructures,
  entities,
  linkedAccountContexts,
  projects,
  proposedUpdates,
  ruksaks,
  users
} from "@/db/schema";
import { baseUrl } from "@/lib/oauth";
import { adaptContextForClient } from "@/mcp/client-adapter";
import { composeOpenRuksakEnvelope } from "@/mcp/open-ruksak-composition";
import {
  type ContextStructureProfile,
  normalizeContext
} from "@/mcp/context-normalization";
import {
  getStoredClientSessionForUser,
  type OpenRuksakHints,
  rememberClientResolution,
  resolveClientProfile,
  resolveProjectForRequest
} from "@/mcp/project-resolution";
import { classifyContextUpdateRisk } from "@/lib/update-risk";

const DEFAULT_STRUCTURE_SLUG = "ruksak_standard_v0_1";

const DEFAULT_STRUCTURE_CONFIG = {
  kinds: [
    { key: "summary", label: "Summary", semantic_role: "summary", entity_types: ["summary", "note"] },
    {
      key: "work_item",
      label: "Work item",
      semantic_role: "work_item",
      entity_types: ["project", "plan", "initiative", "task"]
    },
    {
      key: "lesson",
      label: "Lesson",
      semantic_role: "lesson",
      entity_types: ["learning", "lesson", "reflection"]
    },
    { key: "decision", label: "Decision", semantic_role: "decision", entity_types: ["decision"] },
    {
      key: "reference",
      label: "Reference",
      semantic_role: "reference",
      entity_types: ["resource", "reference", "tool"]
    }
  ]
} satisfies Record<string, unknown>;

export type McpSessionContext = {
  userId: string;
  clientKey?: string | null;
  clientLabel?: string | null;
  transportType: string;
};

function asIsoString(value: Date | null) {
  return value ? value.toISOString() : "";
}

function normalizeText(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

async function ensureContextStructureForUser(userId: string): Promise<ContextStructureProfile> {
  const db = getDb();

  if (!db) {
    return {
      id: "fallback-structure",
      name: "Ruksak Standard",
      slug: DEFAULT_STRUCTURE_SLUG,
      version: "0.1",
      config: DEFAULT_STRUCTURE_CONFIG as ContextStructureProfile["config"]
    };
  }

  const [existingStructure] = await db
    .select()
    .from(contextStructures)
    .where(eq(contextStructures.slug, DEFAULT_STRUCTURE_SLUG))
    .limit(1);

  const structure =
    existingStructure ??
    (
      await db
        .insert(contextStructures)
        .values({
          name: "Ruksak Standard",
          slug: DEFAULT_STRUCTURE_SLUG,
          version: "0.1",
          ownerType: "system",
          ownerId: null,
          configJson: DEFAULT_STRUCTURE_CONFIG
        })
        .returning()
    )[0];

  const [existingRuksak] = await db
    .select()
    .from(ruksaks)
    .where(and(eq(ruksaks.userId, userId), eq(ruksaks.slug, "primary")))
    .limit(1);

  if (!existingRuksak) {
    await db.insert(ruksaks).values({
      userId,
      name: "Primary Ruksak",
      slug: "primary",
      contextStructureId: structure.id
    });
  } else if (!existingRuksak.contextStructureId) {
    await db
      .update(ruksaks)
      .set({
        contextStructureId: structure.id,
        updatedAt: new Date()
      })
      .where(eq(ruksaks.id, existingRuksak.id));
  }

  return {
    id: structure.id,
    name: structure.name,
    slug: structure.slug,
    version: structure.version,
    config: structure.configJson as ContextStructureProfile["config"]
  };
}

async function resolveUser(userId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

type ContextWriteInput = OpenRuksakHints & {
  title: string;
  summary: string;
  kind_key: "summary" | "work_item" | "lesson" | "decision" | "reference";
  semantic_role?: "summary" | "work_item" | "lesson" | "decision" | "reference";
  entity_type?: string;
  project_name?: string;
  project_type?: string;
  parent_project_id?: string;
  account_context_id?: string;
  account_context_slug?: string;
  provenance_type?: string;
  source_project_id?: string;
  source_ref?: Record<string, unknown>;
  data?: Record<string, unknown>;
  priority?: string;
  status?: string;
};

function defaultEntityTypeForKind(kindKey: ContextWriteInput["kind_key"]) {
  switch (kindKey) {
    case "work_item":
      return "task";
    case "lesson":
      return "learning";
    case "decision":
      return "decision";
    case "reference":
      return "reference";
    case "summary":
    default:
      return "summary";
  }
}

function titleSlug(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureProjectForWrite(input: {
  userId: string;
  hints: OpenRuksakHints;
  projectName?: string;
}) {
  const db = getDb();
  if (!db) {
    return {
      project: null,
      created: false
    };
  }

  const resolution = await resolveProjectForRequest({
    userId: input.userId,
    hints: input.hints
  });

  if (resolution.projectId) {
    const [existing] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, input.userId), eq(projects.id, resolution.projectId)))
      .limit(1);

    return {
      project: existing ?? null,
      created: false
    };
  }

  const requestedSlug = input.hints.project_slug
    ? titleSlug(input.hints.project_slug)
    : input.projectName
      ? titleSlug(input.projectName)
      : "";

  if (!requestedSlug) {
    return {
      project: null,
      created: false
    };
  }

  const [matchedBySlug] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, input.userId), eq(projects.slug, requestedSlug)))
    .limit(1);

  if (matchedBySlug) {
    return {
      project: matchedBySlug,
      created: false
    };
  }

  const repoHint = input.hints.repo?.split("/") ?? [];
  const [created] = await db
    .insert(projects)
    .values({
      userId: input.userId,
      name: input.projectName ?? input.hints.project_slug ?? requestedSlug,
      slug: requestedSlug,
      projectType: input.hints.project_type ?? "build",
      parentProjectId: input.hints.parent_project_id ?? null,
      repoOwner: repoHint.length === 2 ? repoHint[0] : null,
      repoName: repoHint.length === 2 ? repoHint[1] : null,
      rootPath: input.hints.cwd ?? null,
      description:
        typeof input.hints.request_text === "string" ? input.hints.request_text : null
    })
    .returning();

  return {
    project: created ?? null,
    created: Boolean(created)
  };
}

async function resolveAccountContextForWrite(input: {
  userId: string;
  project?: {
    primaryAccountContextId: string | null;
  } | null;
  accountContextIdHint?: string;
  accountContextSlugHint?: string;
}) {
  const db = getDb();
  if (!db) {
    return null;
  }

  if (input.accountContextIdHint) {
    const [matchedById] = await db
      .select()
      .from(linkedAccountContexts)
      .where(
        and(
          eq(linkedAccountContexts.userId, input.userId),
          eq(linkedAccountContexts.id, input.accountContextIdHint)
        )
      )
      .limit(1);

    if (matchedById) {
      return matchedById;
    }
  }

  if (input.accountContextSlugHint) {
    const [matchedBySlug] = await db
      .select()
      .from(linkedAccountContexts)
      .where(
        and(
          eq(linkedAccountContexts.userId, input.userId),
          eq(linkedAccountContexts.slug, titleSlug(input.accountContextSlugHint))
        )
      )
      .limit(1);

    if (matchedBySlug) {
      return matchedBySlug;
    }
  }

  if (input.project?.primaryAccountContextId) {
    const [inherited] = await db
      .select()
      .from(linkedAccountContexts)
      .where(
        and(
          eq(linkedAccountContexts.userId, input.userId),
          eq(linkedAccountContexts.id, input.project.primaryAccountContextId)
        )
      )
      .limit(1);

    if (inherited) {
      return inherited;
    }
  }

  return null;
}

export async function openRuksak(
  hints: OpenRuksakHints,
  session: McpSessionContext
) {
  const db = getDb();

  if (!db) {
    return {
      metadata: {
        resolved_client: hints.client ?? "default_v1",
        resolved_project: null,
        confidence: 0,
        resolution_source: "no_database",
        resolution_explanation: ["No database is configured."],
        resolution_signal_breakdown: {
          explicit: [],
          environment: [],
          semantic: [],
          affinity: []
        },
        recommended_actions: ["stay_in_user_level_context"],
        clarification_required: false,
        candidate_projects: [],
        structure_profile: {
          id: "fallback-structure",
          slug: DEFAULT_STRUCTURE_SLUG,
          version: "0.1",
          name: "Ruksak Standard"
        },
        generated_at: new Date().toISOString()
      },
      context: {
        current_context_summary: [
          "Ruksak is running without a database, so only fallback context is available."
        ],
        active_work_items: [],
        current_priorities: [],
        recent_lessons: [],
        decisions: [],
        references: [],
        recent_updates: [],
        grouping_summary: {
          by_project_type: {},
          by_provenance_type: {}
        },
        suggested_next_actions: ["Configure Postgres to unlock durable context retrieval."]
      },
      inspect: {
        workspace_url: "https://www.ruksak.ai/app",
        paths: {
          workspace: "/app",
          current_project: null,
          projects: "/app#projects",
          dashboard: "/app"
        }
      },
      client_brief: "Ruksak fallback brief"
    };
  }

  const user = await resolveUser(session.userId);

  if (!user) {
    throw new Error("Could not resolve the authenticated Ruksak user.");
  }

  const structure = await ensureContextStructureForUser(user.id);
  const resolvedClient = resolveClientProfile({
    explicitClient: hints.client,
    clientKey: session.clientKey,
    clientLabel: session.clientLabel
  });
  const [storedClientSession, resolution, projectRows, recentChangeRows] = await Promise.all([
    getStoredClientSessionForUser(user.id, resolvedClient.key),
    resolveProjectForRequest({
      userId: user.id,
      hints,
      clientKey: resolvedClient.key
    }),
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(asc(projects.name)),
    db
      .select()
      .from(changeEvents)
      .where(eq(changeEvents.userId, user.id))
      .orderBy(desc(changeEvents.createdAt))
      .limit(8)
  ]);

  const entityRows = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.userId, user.id),
        eq(entities.status, "active"),
        resolution.projectId ? eq(entities.projectId, resolution.projectId) : undefined
      )
    )
    .orderBy(desc(entities.updatedAt))
    .limit(30);

  const normalized = normalizeContext({
    structure,
    entities: entityRows,
    projects: projectRows,
    changes: recentChangeRows
  });

  const recentPendingUpdates = await db
    .select({
      id: proposedUpdates.id,
      summary: proposedUpdates.summary,
      createdAt: proposedUpdates.createdAt,
      status: proposedUpdates.status
    })
    .from(proposedUpdates)
    .where(and(eq(proposedUpdates.userId, user.id), eq(proposedUpdates.status, "pending")))
    .orderBy(desc(proposedUpdates.createdAt))
    .limit(5);

  const recentUpdates = [
    ...normalized.recent_updates,
    ...recentPendingUpdates.map((update) => ({
      id: update.id,
      title: "pending_update",
      summary: `${update.status}: ${normalizeText(update.summary)}`,
      created_at: asIsoString(update.createdAt)
    }))
  ]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 8);

  const composed = composeOpenRuksakEnvelope({
    user: {
      displayName: user.displayName,
      primaryEmail: user.primaryEmail
    },
    profile: resolvedClient,
    resolution,
    structureProfile: {
      id: structure.id,
      slug: structure.slug,
      version: structure.version,
      name: structure.name
    },
    workspaceUrl: `${baseUrl()}/app`,
    generatedAt: new Date().toISOString(),
    normalized,
    recentUpdates,
    storedClientSessionExists: Boolean(storedClientSession)
  });

  const adapted = adaptContextForClient({
    profile: resolvedClient,
    envelope: composed
  });

  await rememberClientResolution({
    userId: user.id,
    clientKey: resolvedClient.key,
    transportType: session.transportType,
    lastProjectId: resolution.projectId,
    clientMetadata: {
      detected_client: resolvedClient.label,
      source: resolvedClient.source,
      request_hints: {
        repo: hints.repo ?? null,
        cwd: hints.cwd ?? null,
        project_slug: hints.project_slug ?? null,
        project_type: hints.project_type ?? null
      }
    }
  });

  return adapted;
}

export async function updateRuksakContext(
  input: ContextWriteInput,
  session: McpSessionContext
) {
  const db = getDb();

  if (!db) {
    return {
      ok: false,
      mode: "no_database",
      message: "Ruksak cannot persist context because the database is not configured."
    };
  }

  const user = await resolveUser(session.userId);

  if (!user) {
    throw new Error("Could not resolve the authenticated Ruksak user.");
  }

  const structure = await ensureContextStructureForUser(user.id);
  const projectResolution = await ensureProjectForWrite({
    userId: user.id,
    hints: input,
    projectName: input.project_name
  });
  const project = projectResolution.project;
  const accountContext = await resolveAccountContextForWrite({
    userId: user.id,
    project,
    accountContextIdHint: input.account_context_id,
    accountContextSlugHint: input.account_context_slug
  });

  const semanticRole = input.semantic_role ?? input.kind_key;
  const entityType = input.entity_type ?? defaultEntityTypeForKind(input.kind_key);
  const provenanceType = normalizeText(input.provenance_type) || "synthesized_context";
  const normalizedTitle = normalizeText(input.title);
  const normalizedSummary = normalizeText(input.summary);
  const normalizedStatus = normalizeText(input.status) || "active";
  const normalizedPriority = normalizeText(input.priority) || null;
  const now = new Date();
  const completedAt =
    normalizedStatus === "done" || normalizedStatus === "completed" ? now : null;
  const mergedData = {
    ...(input.data ?? {}),
    ...(normalizedPriority ? { priority: normalizedPriority } : {}),
    ...(normalizedStatus ? { status: normalizedStatus } : {})
  };

  const [existingEntity] = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.userId, user.id),
        eq(entities.title, normalizedTitle),
        eq(entities.kindKey, input.kind_key),
        project ? eq(entities.projectId, project.id) : undefined
      )
    )
    .limit(1);

  const entity =
    existingEntity
      ? (
          await db
            .update(entities)
            .set({
              projectId: project?.id ?? existingEntity.projectId ?? null,
              accountContextId: accountContext?.id ?? existingEntity.accountContextId ?? null,
              entityType,
              kindKey: input.kind_key,
              semanticRole,
              provenanceType,
              sourceProjectId: input.source_project_id ?? existingEntity.sourceProjectId ?? null,
              sourceEntityRef: input.source_ref ?? existingEntity.sourceEntityRef ?? null,
              status: normalizedStatus,
              priority: normalizedPriority,
              summary: normalizedSummary,
              data: {
                ...existingEntity.data,
                ...mergedData
              },
              startedAt:
                existingEntity.startedAt ??
                (normalizedStatus === "active" ? now : existingEntity.startedAt),
              completedAt,
              updatedAt: now
            })
            .where(eq(entities.id, existingEntity.id))
            .returning()
        )[0]
      : (
          await db
            .insert(entities)
            .values({
              userId: user.id,
              projectId: project?.id ?? null,
              accountContextId: accountContext?.id ?? null,
              entityType,
              kindKey: input.kind_key,
              semanticRole,
              provenanceType,
              sourceProjectId: input.source_project_id ?? null,
              sourceEntityRef: input.source_ref ?? null,
              status: normalizedStatus,
              priority: normalizedPriority,
              title: normalizedTitle,
              summary: normalizedSummary,
              data: mergedData,
              startedAt: normalizedStatus === "active" ? now : null,
              completedAt
            })
            .returning()
        )[0];

  const risk = classifyContextUpdateRisk({
    action: existingEntity ? "update" : "create",
    kindKey: input.kind_key,
    existingKindKey: existingEntity?.kindKey ?? null,
    existingStatus: existingEntity?.status ?? null,
    nextStatus: normalizedStatus,
    existingPriority: existingEntity?.priority ?? null,
    nextPriority: normalizedPriority,
    existingSummary: existingEntity?.summary ?? null,
    nextSummary: normalizedSummary,
    projectCreated: projectResolution.created,
    accountContextChanged:
      Boolean(existingEntity) &&
      (existingEntity?.accountContextId ?? null) !== (accountContext?.id ?? null)
  });

  await db.insert(changeEvents).values({
    userId: user.id,
    entityId: entity.id,
    accountContextId: accountContext?.id ?? null,
    actionType: existingEntity ? "context_item_updated" : "context_item_created",
    actorType: "mcp_client",
    actorLabel: session.clientLabel ?? session.clientKey ?? "MCP client",
    originSurface: "mcp",
    after: {
      entityId: entity.id,
      projectId: project?.id ?? null,
      accountContextId: accountContext?.id ?? null,
      title: entity.title,
      summary: entity.summary,
      kindKey: entity.kindKey,
      semanticRole: entity.semanticRole,
      provenanceType: entity.provenanceType
    }
  });

  const [primaryRuksak] = await db
    .select()
    .from(ruksaks)
    .where(and(eq(ruksaks.userId, user.id), eq(ruksaks.slug, "primary")))
    .limit(1);

  if (primaryRuksak && project) {
    await db
      .update(ruksaks)
      .set({
        currentProjectId: project.id,
        contextStructureId: primaryRuksak.contextStructureId ?? structure.id,
        updatedAt: new Date()
      })
      .where(eq(ruksaks.id, primaryRuksak.id));
  }

  return {
    ok: true,
    mode: existingEntity ? "updated" : "created",
    entity: {
      id: entity.id,
      title: entity.title,
      summary: entity.summary,
      kind_key: entity.kindKey,
      semantic_role: entity.semanticRole,
      entity_type: entity.entityType,
      provenance_type: entity.provenanceType,
      source_project_id: entity.sourceProjectId,
      source_ref: entity.sourceEntityRef
    },
    project: project
      ? {
          id: project.id,
          name: project.name,
          slug: project.slug,
          project_type: project.projectType,
          parent_project_id: project.parentProjectId
        }
      : null,
    account_context: accountContext
      ? {
          id: accountContext.id,
          label: accountContext.label,
          slug: accountContext.slug,
          account_type: accountContext.accountType,
          inherited_from_project:
            !input.account_context_id &&
            !input.account_context_slug &&
            accountContext.id === (project?.primaryAccountContextId ?? null)
        }
      : null,
    structure_profile: {
      id: structure.id,
      slug: structure.slug,
      version: structure.version
    },
    update_policy: {
      risk_level: risk.riskLevel,
      auto_captured: risk.autoCaptured,
      review_recommended: risk.reviewRecommended,
      requires_explicit_approval: risk.requiresExplicitApproval,
      reasons: risk.reasons
    },
    next: "Call open_ruksak to verify the updated working context."
  };
}
