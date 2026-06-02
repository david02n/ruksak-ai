import "server-only";

import type {
  CandidateProject,
  ContextMode,
  ContextResolution,
  ResolvedClient
} from "@/mcp/project-resolution";
import type { NormalizedContext, NormalizedContextItem } from "@/mcp/context-normalization";

type UserSummary = {
  displayName: string | null;
  primaryEmail: string;
};

type RecentUpdate = {
  id: string;
  title: string;
  summary: string;
  created_at: string;
};

type AgentStatus = {
  is_registered: boolean;
  matched_agent_profile_id: string | null;
  matched_project_agent_binding_id: string | null;
  registration_recommended: boolean;
};

type GuidanceMode =
  | "focused_project"
  | "multi_project"
  | "portfolio"
  | "user"
  | "new_project_candidate";

type OpenRuksakEnvelope = {
  metadata: {
    resolved_client: string;
    context_mode: ContextMode;
    focus: {
      project_id: string | null;
      project_name: string | null;
      project_slug: string | null;
      project_type: string | null;
      confidence: "low" | "medium" | "high";
      source: string;
      session_focus_applied: boolean;
      explicit_override_applied: boolean;
    };
    confidence: number;
    resolution_source: string;
    resolution_explanation: string[];
    resolution_signal_breakdown: {
      explicit: string[];
      environment: string[];
      semantic: string[];
      affinity: string[];
    };
    clarification_required: boolean;
    new_project_recommended: boolean;
    focus_candidates: CandidateProject[];
    active_portfolio: CandidateProject[];
    structure_profile: {
      id: string;
      slug: string;
      version: string;
      name: string;
    };
    generated_at: string;
  };
  agent_status: AgentStatus;
  orientation: {
    user_priorities: Array<Record<string, unknown>>;
    focus_candidates: CandidateProject[];
    active_portfolio: CandidateProject[];
  };
  context: {
    current_context_summary: string[];
    active_work_items: Array<Record<string, unknown>>;
    current_priorities: Array<Record<string, unknown>>;
    recent_lessons: Array<Record<string, unknown>>;
    decisions: Array<Record<string, unknown>>;
    references: Array<Record<string, unknown>>;
    recent_updates: Array<Record<string, unknown>>;
    grouping_summary: {
      by_project_type: Record<string, number>;
      by_provenance_type: Record<string, number>;
    };
    suggested_next_actions: string[];
  };
  guidance: {
    mode: GuidanceMode;
    instructions: string[];
    required_approvals: Array<"context_write" | "agent_registration" | "project_binding_create" | "project_create">;
    clarifications_needed: string[];
  };
  provisioning: {
    recommended_mcps: string[];
    required_tools: string[];
    instructions: string[];
    constraints: string[];
    client_preferences: Record<string, unknown>;
  };
  inspect: {
    workspace_url: string;
    paths: {
      workspace: string;
      focus_project: string | null;
      projects: string;
      dashboard: string;
    };
  };
  client_brief: string;
};

function priorityScore(priority: unknown) {
  const raw = typeof priority === "string" ? priority.toLowerCase() : priority;

  switch (raw) {
    case "urgent":
    case "p0":
    case 0:
      return 4;
    case "high":
    case "p1":
    case 1:
      return 3;
    case "medium":
    case "p2":
    case 2:
      return 2;
    case "low":
    case "p3":
    case 3:
      return 1;
    default:
      return 0;
  }
}

function safeTimestamp(value?: string | null) {
  return value ? Date.parse(value) || 0 : 0;
}

function compareNewest(left: string, right: string) {
  return safeTimestamp(right) - safeTimestamp(left);
}

function preferredProjectIds(input: {
  mode: ContextMode;
  focusProjectId: string | null;
  focusCandidates: CandidateProject[];
  activePortfolio: CandidateProject[];
}) {
  if (input.mode === "project" && input.focusProjectId) {
    return [input.focusProjectId];
  }

  if (input.mode === "multi_project") {
    return input.focusCandidates.slice(0, 3).map((candidate) => candidate.id);
  }

  if (input.mode === "portfolio") {
    return input.activePortfolio.slice(0, 4).map((candidate) => candidate.id);
  }

  if (input.mode === "new_project_candidate") {
    return input.focusCandidates.slice(0, 2).map((candidate) => candidate.id);
  }

  return [];
}

function rankProjectScopedItems(
  items: NormalizedContextItem[],
  preferredIds: string[],
  role: "summary" | "work_item" | "lesson" | "decision" | "reference"
) {
  const preferredSet = new Set(preferredIds);

  return [...items].sort((left, right) => {
    const leftProjectMatch = left.project_id && preferredSet.has(left.project_id) ? 1 : 0;
    const rightProjectMatch = right.project_id && preferredSet.has(right.project_id) ? 1 : 0;

    if (leftProjectMatch !== rightProjectMatch) {
      return rightProjectMatch - leftProjectMatch;
    }

    if (role === "work_item") {
      const leftStatus = String(left.data.status ?? "").toLowerCase();
      const rightStatus = String(right.data.status ?? "").toLowerCase();
      const leftActive = leftStatus === "active" ? 1 : 0;
      const rightActive = rightStatus === "active" ? 1 : 0;

      if (leftActive !== rightActive) {
        return rightActive - leftActive;
      }

      const priorityDelta = priorityScore(right.data.priority) - priorityScore(left.data.priority);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
    }

    if (role === "summary") {
      const leftOperator = /operator profile/i.test(left.title) ? 1 : 0;
      const rightOperator = /operator profile/i.test(right.title) ? 1 : 0;

      if (leftOperator !== rightOperator) {
        return leftOperator - rightOperator;
      }
    }

    return compareNewest(left.updated_at, right.updated_at);
  });
}

function buildAgentStatus(input: {
  storedClientSessionExists: boolean;
}) {
  return {
    is_registered: input.storedClientSessionExists,
    matched_agent_profile_id: null,
    matched_project_agent_binding_id: null,
    registration_recommended: !input.storedClientSessionExists
  } satisfies AgentStatus;
}

function guidanceModeForContext(mode: ContextMode): GuidanceMode {
  switch (mode) {
    case "project":
      return "focused_project";
    case "multi_project":
      return "multi_project";
    case "portfolio":
      return "portfolio";
    case "new_project_candidate":
      return "new_project_candidate";
    default:
      return "user";
  }
}

function buildGuidance(input: {
  resolution: ContextResolution;
  agentStatus: AgentStatus;
}) {
  const mode = guidanceModeForContext(input.resolution.mode);
  const instructions: string[] = [];
  const requiredApprovals = new Set<
    "context_write" | "agent_registration" | "project_binding_create" | "project_create"
  >();
  const clarificationsNeeded: string[] = [];

  if (!input.agentStatus.is_registered) {
    instructions.push("Explain that this agent is not yet registered in Ruksak.");
    requiredApprovals.add("agent_registration");
  }

  switch (input.resolution.mode) {
    case "project":
      instructions.push("Load deep project context and proceed without asking for project confirmation.");
      break;
    case "multi_project":
      instructions.push("Stay in cross-project mode unless the next action requires a single bound project.");
      break;
    case "portfolio":
      instructions.push("Stay at portfolio level and prioritize active work across projects.");
      break;
    case "new_project_candidate":
      instructions.push("Treat this as likely distinct new work, not an automatic match to an existing project.");
      requiredApprovals.add("project_create");
      break;
    case "user":
      instructions.push("Stay in user-level orientation until a project-specific signal appears.");
      break;
  }

  if (input.resolution.clarificationRequired) {
    clarificationsNeeded.push("confirm_focus_project");
  }

  return {
    mode,
    instructions,
    required_approvals: Array.from(requiredApprovals),
    clarifications_needed: clarificationsNeeded
  };
}

function buildSummaryLines(input: {
  user: UserSummary;
  resolution: ContextResolution;
  focusProject: CandidateProject | null;
  activeWorkItems: Array<Record<string, unknown>>;
  lessonsCount: number;
  updatesCount: number;
}) {
  const name = input.user.displayName ?? input.user.primaryEmail;

  const opener =
    input.resolution.mode === "project" && input.focusProject
      ? `${name}'s current request focus is ${input.focusProject.name}.`
      : input.resolution.mode === "multi_project"
        ? `${name}'s current request spans multiple likely projects.`
        : input.resolution.mode === "portfolio"
          ? `${name}'s portfolio context is active for this request.`
          : input.resolution.mode === "new_project_candidate"
            ? `${name}'s request looks like distinct new work that may become a new project.`
            : `${name}'s user-level Ruksak context is active.`;

  return [
    opener,
    `There are ${input.activeWorkItems.length} active work items, ${input.lessonsCount} recent lessons, and ${input.updatesCount} recent changes.`,
    ...input.resolution.resolutionExplanation
  ];
}

function buildSuggestedNextActions(input: {
  resolution: ContextResolution;
  currentPriorities: Array<{ title: string; summary: string | null }>;
}) {
  const nextActions: string[] = [];

  switch (input.resolution.mode) {
    case "project":
      nextActions.push("Continue in the focused project context.");
      break;
    case "multi_project":
      nextActions.push("Stay in multi-project mode unless the next action requires one bound project.");
      break;
    case "portfolio":
      nextActions.push("Work from the active portfolio rather than forcing a single project focus.");
      break;
    case "new_project_candidate":
      nextActions.push("Create a new project or workstream if the request truly does not fit an existing one.");
      break;
    case "user":
      nextActions.push("Stay at user-level context until a stronger project signal appears.");
      break;
  }

  input.currentPriorities.slice(0, 2).forEach((item) => {
    nextActions.push(`Continue "${item.title}"${item.summary ? ` — ${item.summary}` : ""}.`);
  });

  return nextActions;
}

function buildProvisioning(input: {
  profile: ResolvedClient;
  agentStatus: AgentStatus;
  guidanceMode: GuidanceMode;
}) {
  const instructions = [
    "Use open_ruksak first to establish request-scoped context before making durable changes."
  ];

  if (input.agentStatus.registration_recommended) {
    instructions.push("If the user approves, register this host/client as a reusable Ruksak agent profile.");
  }

  return {
    recommended_mcps: ["ruksak-ai"],
    required_tools: ["open_ruksak"],
    instructions,
    constraints: [
      "Do not persist inferred project focus between requests.",
      "Do not assume a single project when portfolio or multi-project mode is sufficient."
    ],
    client_preferences: {
      profile: input.profile.profile,
      guidance_mode: input.guidanceMode
    }
  };
}

function buildClientBrief(input: {
  profile: ResolvedClient["profile"];
  resolution: ContextResolution;
  focusProject: CandidateProject | null;
  activeWorkItems: Array<Record<string, unknown>>;
  recentLessons: Array<Record<string, unknown>>;
  recentUpdates: Array<Record<string, unknown>>;
}) {
  const modeLine =
    input.resolution.mode === "project" && input.focusProject
      ? `Focused project: ${input.focusProject.name}`
      : input.resolution.mode === "multi_project"
        ? "Context mode: multi-project"
        : input.resolution.mode === "portfolio"
          ? "Context mode: portfolio"
          : input.resolution.mode === "new_project_candidate"
            ? "Context mode: new project candidate"
            : "Context mode: user";
  const lines = [
    modeLine,
    `Active work items: ${input.activeWorkItems.length}`,
    `Recent lessons: ${input.recentLessons.length}`,
    `Recent updates: ${input.recentUpdates.length}`
  ];

  switch (input.profile) {
    case "codex_v1":
      return ["Codex brief", ...lines].join("\n");
    case "windsurf_v1":
      return ["Windsurf brief", ...lines].join("\n");
    case "cursor_v1":
      return ["Cursor brief", ...lines].join("\n");
    default:
      return ["Ruksak brief", ...lines].join("\n");
  }
}

export function composeOpenRuksakEnvelope(input: {
  user: UserSummary;
  profile: ResolvedClient;
  resolution: ContextResolution;
  structureProfile: {
    id: string;
    slug: string;
    version: string;
    name: string;
  };
  workspaceUrl: string;
  generatedAt: string;
  normalized: NormalizedContext;
  recentUpdates: RecentUpdate[];
  storedClientSessionExists: boolean;
}) {
  const focusProject =
    input.resolution.activePortfolio.find(
      (candidate) => candidate.id === input.resolution.focusProjectId
    ) ??
    input.resolution.focusCandidates.find(
      (candidate) => candidate.id === input.resolution.focusProjectId
    ) ??
    null;
  const preferredIds = preferredProjectIds({
    mode: input.resolution.mode,
    focusProjectId: input.resolution.focusProjectId,
    focusCandidates: input.resolution.focusCandidates,
    activePortfolio: input.resolution.activePortfolio
  });
  const rankedSummary = rankProjectScopedItems(input.normalized.summary, preferredIds, "summary");
  const rankedWorkItems = rankProjectScopedItems(input.normalized.work_items, preferredIds, "work_item");
  const rankedLessons = rankProjectScopedItems(input.normalized.lessons, preferredIds, "lesson");
  const rankedDecisions = rankProjectScopedItems(input.normalized.decisions, preferredIds, "decision");
  const rankedReferences = rankProjectScopedItems(input.normalized.references, preferredIds, "reference");
  const groupingSummary = {
    by_project_type: {} as Record<string, number>,
    by_provenance_type: {} as Record<string, number>
  };

  const allItems = [
    ...rankedSummary,
    ...rankedWorkItems,
    ...rankedLessons,
    ...rankedDecisions,
    ...rankedReferences
  ];

  allItems.forEach((item) => {
    const projectType = item.project_type ?? "unscoped";
    const provenanceType = item.provenance_type ?? "synthesized_context";
    groupingSummary.by_project_type[projectType] =
      (groupingSummary.by_project_type[projectType] ?? 0) + 1;
    groupingSummary.by_provenance_type[provenanceType] =
      (groupingSummary.by_provenance_type[provenanceType] ?? 0) + 1;
  });

  const activeWorkItems = rankedWorkItems.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    kind_key: item.kind_key,
    semantic_role: item.semantic_role,
    updated_at: item.updated_at,
    project_slug: item.project_slug,
    project_type: item.project_type,
    provenance_type: item.provenance_type,
    source_project_slug: item.source_project_slug,
    priority: item.data.priority ?? null,
    status: item.data.status ?? null
  }));

  const currentPriorities = [...activeWorkItems]
    .sort((left, right) => {
      const priorityDelta = priorityScore(right.priority) - priorityScore(left.priority);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return compareNewest(String(left.updated_at), String(right.updated_at));
    })
    .slice(0, 4);

  const recentLessons = rankedLessons.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    updated_at: item.updated_at,
    project_slug: item.project_slug,
    project_type: item.project_type,
    provenance_type: item.provenance_type,
    source_project_slug: item.source_project_slug
  }));

  const decisions = rankedDecisions.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    updated_at: item.updated_at,
    project_slug: item.project_slug,
    project_type: item.project_type,
    provenance_type: item.provenance_type,
    source_project_slug: item.source_project_slug
  }));

  const references = rankedReferences.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    updated_at: item.updated_at,
    project_slug: item.project_slug,
    project_type: item.project_type,
    provenance_type: item.provenance_type,
    source_project_slug: item.source_project_slug
  }));

  const agentStatus = buildAgentStatus({
    storedClientSessionExists: input.storedClientSessionExists
  });
  const guidance = buildGuidance({
    resolution: input.resolution,
    agentStatus
  });
  const summaryLines = buildSummaryLines({
    user: input.user,
    resolution: input.resolution,
    focusProject,
    activeWorkItems,
    lessonsCount: recentLessons.length,
    updatesCount: input.recentUpdates.length
  });

  const orientation = {
    user_priorities: currentPriorities,
    focus_candidates: input.resolution.focusCandidates,
    active_portfolio: input.resolution.activePortfolio
  };

  const context = {
    current_context_summary: summaryLines,
    active_work_items: activeWorkItems,
    current_priorities: currentPriorities,
    recent_lessons: recentLessons,
    decisions,
    references,
    recent_updates: input.recentUpdates,
    grouping_summary: groupingSummary,
    suggested_next_actions: buildSuggestedNextActions({
      resolution: input.resolution,
      currentPriorities: currentPriorities.map((item) => ({
        title: String(item.title),
        summary: typeof item.summary === "string" ? item.summary : null
      }))
    })
  };

  const provisioning = buildProvisioning({
    profile: input.profile,
    agentStatus,
    guidanceMode: guidance.mode
  });

  return {
    metadata: {
      resolved_client: input.profile.label,
      context_mode: input.resolution.mode,
      focus: {
        project_id: focusProject?.id ?? null,
        project_name: focusProject?.name ?? null,
        project_slug: focusProject?.slug ?? null,
        project_type: focusProject?.project_type ?? null,
        confidence: input.resolution.confidenceLabel,
        source: input.resolution.resolutionSource,
        session_focus_applied: input.resolution.sessionFocusApplied,
        explicit_override_applied: input.resolution.explicitOverrideApplied
      },
      confidence: input.resolution.confidence,
      resolution_source: input.resolution.resolutionSource,
      resolution_explanation: input.resolution.resolutionExplanation,
      resolution_signal_breakdown: input.resolution.resolutionSignalBreakdown,
      clarification_required: input.resolution.clarificationRequired,
      new_project_recommended: input.resolution.newProjectRecommended,
      focus_candidates: input.resolution.focusCandidates,
      active_portfolio: input.resolution.activePortfolio,
      structure_profile: input.structureProfile,
      generated_at: input.generatedAt
    },
    agent_status: agentStatus,
    orientation,
    context,
    guidance,
    provisioning,
    inspect: {
      workspace_url: input.workspaceUrl,
      paths: {
        workspace: "/app",
        focus_project: focusProject ? `/app?project=${focusProject.slug}` : null,
        projects: "/app#projects",
        dashboard: "/app"
      }
    },
    client_brief: buildClientBrief({
      profile: input.profile.profile,
      resolution: input.resolution,
      focusProject,
      activeWorkItems,
      recentLessons,
      recentUpdates: input.recentUpdates
    })
  } satisfies OpenRuksakEnvelope;
}

export type { OpenRuksakEnvelope, AgentStatus, GuidanceMode };
