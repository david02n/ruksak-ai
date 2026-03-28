import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { getDb } from "@/db/client";
import { clientSessions, projects, ruksaks } from "@/db/schema";
import {
  finalizeProjectResolution,
  projectRepo,
  type ProjectLike,
  type ProjectResolution
} from "@/mcp/project-resolution-core";
export type { CandidateProject, ProjectResolution } from "@/mcp/project-resolution-core";

type ClientSessionRow = InferSelectModel<typeof clientSessions>;

export type OpenRuksakHints = {
  client?: string;
  project_id?: string;
  project_slug?: string;
  project_type?: string;
  parent_project_id?: string;
  repo?: string;
  cwd?: string;
  request_text?: string;
};

const NON_BUILD_PROJECT_TYPES = ["workstream", "foundation", "operating_model"] as const;

const NEW_CONTEXT_PATTERNS = [
  /\bnew\b/i,
  /\bseparate\b/i,
  /\bfoundation\b/i,
  /\bworkstream\b/i,
  /\boperating model\b/i,
  /\bmeta\b/i,
  /\boperating system\b/i,
  /\bnot\s+[a-z0-9-]+\b/i
];

export type ResolvedClient = {
  key: string;
  profile: "windsurf_v1" | "codex_v1" | "cursor_v1" | "default_v1";
  source: "explicit_hint" | "session_metadata" | "fallback";
  label: string;
};

const CLIENT_ALIASES: Array<{
  match: RegExp;
  profile: ResolvedClient["profile"];
  label: string;
}> = [
  { match: /windsurf/i, profile: "windsurf_v1", label: "windsurf_v1" },
  { match: /codex|chatgpt|openai/i, profile: "codex_v1", label: "codex_v1" },
  { match: /cursor/i, profile: "cursor_v1", label: "cursor_v1" }
];

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeRepoHint(repo?: string) {
  const cleaned = normalizeText(repo)
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^git@github\.com:/, "")
    .replace(/\.git$/, "")
    .replace(/^github\.com\//, "");

  return cleaned;
}

function normalizePath(value?: string | null) {
  return normalizeText(value).replace(/\\/g, "/");
}

function normalizeProjectType(value?: string | null) {
  const normalized = normalizeText(value);

  if (normalized === "operating-model" || normalized === "operating model") {
    return "operating_model";
  }

  return normalized;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "from",
  "how",
  "i",
  "in",
  "into",
  "is",
  "it",
  "my",
  "of",
  "on",
  "open",
  "project",
  "ruksak",
  "show",
  "tell",
  "the",
  "this",
  "to",
  "update",
  "what",
  "with"
]);

function tokenize(value?: string | null) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    )
  );
}

function phraseMatches(haystack: string, needle?: string | null) {
  const normalizedNeedle = normalizeText(needle);
  return Boolean(normalizedNeedle && haystack.includes(normalizedNeedle));
}

function overlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token)).length;
}

function inferProjectTypeFromRequest(requestText?: string | null) {
  const normalized = normalizeText(requestText);

  if (!normalized) {
    return null;
  }

  if (/\boperating model\b|\bmeta\b|\boperating system\b/i.test(normalized)) {
    return "operating_model";
  }

  if (/\bfoundation\b/i.test(normalized)) {
    return "foundation";
  }

  if (/\bworkstream\b|\binitiative\b|\bdomain\b/i.test(normalized)) {
    return "workstream";
  }

  return null;
}

function requestSuggestsNewContext(requestText?: string | null) {
  const normalized = normalizeText(requestText);
  return Boolean(normalized && NEW_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalized)));
}

function detectProfile(value?: string | null) {
  const normalized = normalizeText(value);

  for (const alias of CLIENT_ALIASES) {
    if (alias.match.test(normalized)) {
      return alias;
    }
  }

  return null;
}

export function resolveClientProfile(input: {
  explicitClient?: string;
  clientKey?: string | null;
  clientLabel?: string | null;
}): ResolvedClient {
  const explicit = detectProfile(input.explicitClient);

  if (explicit) {
    return {
      key: input.explicitClient ?? explicit.label,
      profile: explicit.profile,
      source: "explicit_hint",
      label: explicit.label
    };
  }

  const sessionProfile = detectProfile(input.clientLabel) ?? detectProfile(input.clientKey);

  if (sessionProfile) {
    return {
      key: input.clientKey ?? input.clientLabel ?? sessionProfile.label,
      profile: sessionProfile.profile,
      source: "session_metadata",
      label: sessionProfile.label
    };
  }

  return {
    key: input.clientKey ?? input.clientLabel ?? "default",
    profile: "default_v1",
    source: "fallback",
    label: "default_v1"
  };
}

export async function getStoredClientSessionForUser(userId: string, clientKey?: string | null) {
  const db = getDb();
  if (!db || !clientKey) {
    return null;
  }

  const [session] = await db
    .select()
    .from(clientSessions)
    .where(and(eq(clientSessions.userId, userId), eq(clientSessions.clientKey, clientKey)))
    .limit(1);

  return session ?? null;
}

async function getPrimaryRuksakProjectId(userId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [primary] = await db
    .select({ currentProjectId: ruksaks.currentProjectId })
    .from(ruksaks)
    .where(and(eq(ruksaks.userId, userId), eq(ruksaks.slug, "primary")))
    .limit(1);

  return primary?.currentProjectId ?? null;
}

function scoreProjectCandidate(input: {
  project: ProjectLike;
  hints: OpenRuksakHints;
  storedSession: ClientSessionRow | null;
  primaryProjectId?: string | null;
}) {
  const signals: string[] = [];
  let score = 0;
  const projectType = normalizeProjectType(input.project.projectType) || "build";
  const requestedProjectType = normalizeProjectType(input.hints.project_type);
  const inferredProjectType = inferProjectTypeFromRequest(input.hints.request_text);
  const newContextLikely = requestSuggestsNewContext(input.hints.request_text);

  if (input.hints.project_id && input.hints.project_id === input.project.id) {
    signals.push("explicit_project_id");
    score += 100;
  }

  if (
    input.hints.project_slug &&
    normalizeText(input.hints.project_slug) === normalizeText(input.project.slug)
  ) {
    signals.push("explicit_project_slug");
    score += 95;
  }

  if (requestedProjectType && requestedProjectType === projectType) {
    signals.push("explicit_project_type");
    score += 44;
  } else if (requestedProjectType && requestedProjectType !== projectType) {
    score -= 18;
  }

  const normalizedRepoHint = normalizeRepoHint(input.hints.repo);
  const repoValue = projectRepo(input.project);

  if (normalizedRepoHint && repoValue && normalizedRepoHint === repoValue) {
    signals.push("repo_mapping");
    score += 70;
  } else if (
    normalizedRepoHint &&
    (repoValue?.includes(normalizedRepoHint) ||
      normalizedRepoHint.includes(repoValue ?? "") ||
      normalizeText(input.project.slug).includes(normalizedRepoHint))
  ) {
    signals.push("repo_hint_partial");
    score += 35;
  }

  const normalizedCwd = normalizePath(input.hints.cwd);

  if (normalizedCwd) {
    if (input.project.rootPath && normalizedCwd.startsWith(normalizePath(input.project.rootPath))) {
      signals.push("cwd_root_path");
      score += 75;
    } else if (
      normalizedCwd.includes(normalizeText(input.project.slug)) ||
      normalizedCwd.includes(normalizeText(input.project.name))
    ) {
      signals.push("cwd_slug_match");
      score += 28;
    }
  }

  const requestText = normalizeText(input.hints.request_text);
  const projectName = normalizeText(input.project.name);
  const projectSlug = normalizeText(input.project.slug);
  const projectDescription = normalizeText(input.project.description);
  const requestTokens = tokenize(input.hints.request_text);
  const projectTokens = tokenize([input.project.name, input.project.slug, repoValue].join(" "));

  if (requestText) {
    if (phraseMatches(requestText, projectSlug) || phraseMatches(requestText, projectName)) {
      signals.push("request_text_exact_project");
      score += 48;
    }

    if (repoValue && phraseMatches(requestText, repoValue)) {
      signals.push("request_text_repo_match");
      score += 32;
    }

    if (inferredProjectType && inferredProjectType === projectType) {
      signals.push("request_text_project_type_match");
      score += 34;
    } else if (inferredProjectType && inferredProjectType !== projectType) {
      score -= 12;
    }

    const tokenMatches = overlapCount(requestTokens, projectTokens);
    if (tokenMatches > 0) {
      signals.push("request_text_token_overlap");
      score += Math.min(24, tokenMatches * 12);
    }

    if (projectDescription) {
      const descriptionTokens = tokenize(projectDescription);
      const descriptionMatches = overlapCount(requestTokens, descriptionTokens);

      if (descriptionMatches > 0) {
        signals.push("request_text_description_overlap");
        score += Math.min(14, descriptionMatches * 7);
      }
    }
  }

  if (newContextLikely && projectType === "build") {
    signals.push("request_text_new_context");
    score -= 10;
  } else if (newContextLikely && NON_BUILD_PROJECT_TYPES.includes(projectType as (typeof NON_BUILD_PROJECT_TYPES)[number])) {
    signals.push("request_text_new_context");
    score += 8;
  }

  if (input.storedSession?.lastProjectId === input.project.id) {
    signals.push("session_affinity");
    score += newContextLikely ? 6 : 12;
  }

  if (input.primaryProjectId === input.project.id) {
    signals.push("current_project_affinity");
    score += newContextLikely ? 5 : 10;
  }

  const hasDirectNonAffinitySignal = signals.some(
    (signal) =>
      !["session_affinity", "current_project_affinity", "request_text_new_context"].includes(signal)
  );

  if (!hasDirectNonAffinitySignal && signals.includes("session_affinity")) {
    score = Math.min(score, 28);
  }

  if (
    signals.some((signal) =>
      ["repo_mapping", "cwd_root_path", "request_text_exact_project", "request_text_repo_match"].includes(signal)
    ) &&
    signals.includes("session_affinity")
  ) {
    score -= 4;
  }

  return { score, signals };
}

export async function resolveProjectForRequest(input: {
  userId: string;
  hints: OpenRuksakHints;
  clientKey?: string | null;
}) {
  const db = getDb();

  if (!db) {
    return {
      projectId: null,
      confidence: 0,
      resolutionSource: "no_database",
      resolutionExplanation: ["No database is configured."],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: [],
        semantic: [],
        affinity: []
      },
      recommendedActions: ["stay_in_user_level_context"],
      candidateProjects: [],
      clarificationRequired: false
    } satisfies ProjectResolution;
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, input.userId))
    .orderBy(desc(projects.updatedAt));

  const [storedSession, primaryProjectId] = await Promise.all([
    getStoredClientSessionForUser(input.userId, input.clientKey),
    getPrimaryRuksakProjectId(input.userId)
  ]);

  if (!userProjects.length) {
    return {
      projectId: null,
      confidence: 0,
      resolutionSource: "no_projects",
      resolutionExplanation: ["No projects exist yet for this user."],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: [],
        semantic: [],
        affinity: []
      },
      recommendedActions: ["create_new_project"],
      candidateProjects: [],
      clarificationRequired: false
    } satisfies ProjectResolution;
  }

  const rankedCandidates = userProjects
    .map((project) => {
      const ranked = scoreProjectCandidate({
        project,
        hints: input.hints,
        storedSession,
        primaryProjectId
      });

      return {
        project,
        score: ranked.score,
        signals: ranked.signals
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return finalizeProjectResolution({
    userProjects,
    rankedCandidates
  });
}

export async function rememberClientResolution(input: {
  userId: string;
  clientKey: string;
  transportType: string;
  lastProjectId?: string | null;
  clientMetadata: Record<string, unknown>;
}) {
  const db = getDb();

  if (!db || !input.clientKey) {
    return;
  }

  const [existing] = await db
    .select()
    .from(clientSessions)
    .where(and(eq(clientSessions.userId, input.userId), eq(clientSessions.clientKey, input.clientKey)))
    .limit(1);

  if (existing) {
    await db
      .update(clientSessions)
      .set({
        transportType: input.transportType,
        lastProjectId: input.lastProjectId ?? existing.lastProjectId ?? null,
        clientMetadataJson: input.clientMetadata,
        lastSeenAt: new Date()
      })
      .where(eq(clientSessions.id, existing.id));

    return;
  }

  await db.insert(clientSessions).values({
    userId: input.userId,
    clientKey: input.clientKey,
    transportType: input.transportType,
    lastProjectId: input.lastProjectId ?? null,
    clientMetadataJson: input.clientMetadata,
    firstSeenAt: new Date(),
    lastSeenAt: new Date()
  });
}
