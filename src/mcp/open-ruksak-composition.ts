import "server-only";

import type { CandidateProject, ProjectResolution, ResolvedClient } from "@/mcp/project-resolution";
import type { ContextStructureProfile, NormalizedContext, NormalizedContextItem } from "@/mcp/context-normalization";

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
  | "high_confidence_auto_open"
  | "medium_confidence_confirm"
  | "low_confidence_choose_from_candidates"
  | "unregistered_agent_safe_mode";

type OpenRuksakEnvelope = {
  metadata: {
    resolved_client: string;
    resolved_project: {
      id: string | null;
      name: string | null;
      slug: string | null;
      project_type: string | null;
      parent_project: {
        id: string | null;
      } | null;
      confidence: "low" | "medium" | "high";
      resolution_source: string;
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
    recommended_actions: string[];
    clarification_required: boolean;
    candidate_projects: CandidateProject[];
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
    likely_projects: CandidateProject[];
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
      current_project: string | null;
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

function confidenceLabel(value: number) {
  if (value >= 0.9) {
    return "high" as const;
  }

  if (value >= 0.7) {
    return "medium" as const;
  }

  return "low" as const;
}

function compareNewest(left: string, right: string) {
  return safeTimestamp(right) - safeTimestamp(left);
}

function rankProjectScopedItems(
  items: NormalizedContextItem[],
  resolvedProjectId: string | null,
  role: "summary" | "work_item" | "lesson" | "decision" | "reference"
) {
  return [...items].sort((left, right) => {
    const leftProjectMatch = resolvedProjectId && left.project_id === resolvedProjectId ? 1 : 0;
    const rightProjectMatch = resolvedProjectId && right.project_id === resolvedProjectId ? 1 : 0;

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

function buildSummaryLines(input: {
  user: UserSummary;
  resolvedProject: CandidateProject | null;
  rankedSummary: NormalizedContextItem[];
  activeWorkItems: Array<Record<string, unknown>>;
  lessonsCount: number;
  updatesCount: number;
}) {
  const name = input.user.displayName ?? input.user.primaryEmail;
  const lines = [
    input.resolvedProject
      ? `${name}'s active project context is ${input.resolvedProject.name}.`
      : `${name}'s user-level Ruksak context is active.`,
    `There are ${input.activeWorkItems.length} active work items, ${input.lessonsCount} recent lessons, and ${input.updatesCount} recent changes.`
  ];

  const projectSummary = input.rankedSummary.find((item) => !/operator profile/i.test(item.title));
  if (projectSummary) {
    lines.push(projectSummary.summary ? `${projectSummary.title}: ${projectSummary.summary}` : projectSummary.title);
  }

  const operatorSummary = input.rankedSummary.find((item) => /operator profile/i.test(item.title));
  if (operatorSummary) {
    lines.push(operatorSummary.summary ? `${operatorSummary.title}: ${operatorSummary.summary}` : operatorSummary.title);
  }

  return lines;
}

function buildSuggestedNextActions(input: {
  mode: GuidanceMode;
  clarificationRequired: boolean;
  candidateProjects: CandidateProject[];
  recommendedActions: string[];
  currentPriorities: Array<{ title: string; summary: string | null }>;
}) {
  const nextActions: string[] = [];

  if (input.mode === "low_confidence_choose_from_candidates") {
    if (input.recommendedActions.includes("create_new_foundation_or_workstream")) {
      nextActions.push("Treat this as a likely new foundation or workstream instead of auto-opening an existing build project.");
    } else if (input.candidateProjects.length) {
      nextActions.push(
        `Confirm the project context. Likely projects: ${input.candidateProjects
          .slice(0, 3)
          .map((project) => project.name)
          .join(", ")}.`
      );
    } else {
      nextActions.push("Confirm whether this is an existing project or a new project.");
    }
  } else if (input.mode === "medium_confidence_confirm" || input.clarificationRequired) {
    nextActions.push("Confirm the current project before treating the active context as authoritative.");
  }

  input.currentPriorities.slice(0, 2).forEach((item) => {
    nextActions.push(`Continue "${item.title}"${item.summary ? ` — ${item.summary}` : ""}.`);
  });

  return nextActions;
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

function buildGuidance(input: {
  resolution: ProjectResolution;
  agentStatus: AgentStatus;
  candidateProjects: CandidateProject[];
}) {
  let mode: GuidanceMode;

  if (!input.agentStatus.is_registered && (input.resolution.clarificationRequired || !input.resolution.projectId)) {
    mode = "unregistered_agent_safe_mode";
  } else if (input.resolution.projectId && input.resolution.confidence >= 0.9 && !input.resolution.clarificationRequired) {
    mode = "high_confidence_auto_open";
  } else if (input.resolution.confidence >= 0.7 && input.candidateProjects.length) {
    mode = "medium_confidence_confirm";
  } else {
    mode = "low_confidence_choose_from_candidates";
  }

  const instructions: string[] = [];
  const requiredApprovals = new Set<
    "context_write" | "agent_registration" | "project_binding_create" | "project_create"
  >();
  const clarificationsNeeded: string[] = [];

  if (!input.agentStatus.is_registered) {
    instructions.push("Explain that this agent is not yet registered in Ruksak.");
    instructions.push("Stay in safe orientation mode until the user confirms project context and approves durable writes.");
    requiredApprovals.add("agent_registration");
  }

  switch (mode) {
    case "high_confidence_auto_open":
      instructions.push("Reopen the most likely project context and explain briefly why it was chosen.");
      instructions.push("Use light confirmation rather than forcing a full project-selection step.");
      break;
    case "medium_confidence_confirm":
      instructions.push("Present the likely project and ask the user to confirm before relying on deep project detail.");
      if (input.resolution.recommendedActions.includes("create_new_foundation_or_workstream")) {
        instructions.push("Offer a new foundation or workstream path rather than implying one of the existing projects must be correct.");
      }
      clarificationsNeeded.push("confirm_current_project");
      requiredApprovals.add("project_binding_create");
      break;
    case "low_confidence_choose_from_candidates":
      instructions.push("Stay at user-orientation level and present likely projects, a new-project path, or a new foundation/workstream path.");
      instructions.push("Do not assume the correct project from weak signals alone.");
      clarificationsNeeded.push("choose_project");
      if (!input.candidateProjects.length) {
        requiredApprovals.add("project_create");
      }
      break;
    case "unregistered_agent_safe_mode":
      instructions.push("Offer likely projects or a new-project path before opening deep project detail.");
      instructions.push("Ask whether the user wants this agent or session recorded in Ruksak.");
      clarificationsNeeded.push("choose_project");
      requiredApprovals.add("context_write");
      break;
  }

  if (!input.resolution.projectId) {
    clarificationsNeeded.push("confirm_or_create_project");
    if (!input.candidateProjects.length) {
      requiredApprovals.add("project_create");
    }
  }

  return {
    mode,
    instructions,
    required_approvals: Array.from(requiredApprovals),
    clarifications_needed: Array.from(new Set(clarificationsNeeded))
  };
}

function buildProvisioning(input: {
  profile: ResolvedClient;
  agentStatus: AgentStatus;
  guidanceMode: GuidanceMode;
}) {
  const instructions = [
    "Use open_ruksak first to establish current working context before making durable changes."
  ];

  if (input.agentStatus.registration_recommended) {
    instructions.push("If the user approves, register this host/client as a reusable Ruksak agent profile.");
  }

  return {
    recommended_mcps: ["ruksak-ai"],
    required_tools: ["open_ruksak"],
    instructions,
    constraints: [
      "Do not persist context changes without user approval.",
      "Do not assume project bindings from weak signals."
    ],
    client_preferences: {
      profile: input.profile.profile,
      guidance_mode: input.guidanceMode
    }
  };
}

function buildClientBrief(input: {
  profile: ResolvedClient["profile"];
  resolvedProject: CandidateProject | null;
  activeWorkItems: Array<Record<string, unknown>>;
  recentLessons: Array<Record<string, unknown>>;
  recentUpdates: Array<Record<string, unknown>>;
}) {
  const lines = [
    input.resolvedProject
      ? `Resolved project: ${input.resolvedProject.name}`
      : "Project context is unresolved; user-level orientation returned.",
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
  resolution: ProjectResolution;
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
  const resolvedProject =
    input.resolution.candidateProjects.find((candidate) => candidate.id === input.resolution.projectId) ?? null;

  const rankedSummary = rankProjectScopedItems(input.normalized.summary, input.resolution.projectId, "summary");
  const rankedWorkItems = rankProjectScopedItems(input.normalized.work_items, input.resolution.projectId, "work_item");
  const rankedLessons = rankProjectScopedItems(input.normalized.lessons, input.resolution.projectId, "lesson");
  const rankedDecisions = rankProjectScopedItems(input.normalized.decisions, input.resolution.projectId, "decision");
  const rankedReferences = rankProjectScopedItems(input.normalized.references, input.resolution.projectId, "reference");
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
    .slice(0, 3);

  const recentLessons = rankedLessons.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    updated_at: item.updated_at,
    provenance_type: item.provenance_type,
    source_project_slug: item.source_project_slug
  }));

  const decisions = rankedDecisions.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    updated_at: item.updated_at,
    provenance_type: item.provenance_type,
    source_project_slug: item.source_project_slug
  }));

  const references = rankedReferences.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    updated_at: item.updated_at,
    provenance_type: item.provenance_type,
    source_project_slug: item.source_project_slug
  }));

  const agentStatus = buildAgentStatus({
    storedClientSessionExists: input.storedClientSessionExists
  });
  const guidance = buildGuidance({
    resolution: input.resolution,
    agentStatus,
    candidateProjects: input.resolution.candidateProjects
  });
  const summaryLines = buildSummaryLines({
    user: input.user,
    resolvedProject,
    rankedSummary,
    activeWorkItems,
    lessonsCount: recentLessons.length,
    updatesCount: input.recentUpdates.length
  });

  const orientation = {
    user_priorities: currentPriorities,
    likely_projects:
      !input.resolution.projectId || input.resolution.clarificationRequired
        ? input.resolution.candidateProjects.slice(0, 5)
        : []
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
      mode: guidance.mode,
      clarificationRequired: input.resolution.clarificationRequired,
      candidateProjects: input.resolution.candidateProjects,
      recommendedActions: input.resolution.recommendedActions,
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
      resolved_project: {
        id: resolvedProject?.id ?? null,
        name: resolvedProject?.name ?? null,
        slug: resolvedProject?.slug ?? null,
        project_type: resolvedProject?.project_type ?? null,
        parent_project: resolvedProject
          ? {
              id: resolvedProject.parent_project_id
            }
          : null,
        confidence: confidenceLabel(input.resolution.confidence),
        resolution_source: input.resolution.resolutionSource
      },
      confidence: input.resolution.confidence,
      resolution_source: input.resolution.resolutionSource,
      resolution_explanation: input.resolution.resolutionExplanation,
      resolution_signal_breakdown: input.resolution.resolutionSignalBreakdown,
      recommended_actions: input.resolution.recommendedActions,
      clarification_required: input.resolution.clarificationRequired,
      candidate_projects: input.resolution.candidateProjects,
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
        current_project: resolvedProject ? `/app?project=${resolvedProject.slug}` : null,
        projects: "/app#projects",
        dashboard: "/app"
      }
    },
    client_brief: buildClientBrief({
      profile: input.profile.profile,
      resolvedProject,
      activeWorkItems,
      recentLessons,
      recentUpdates: input.recentUpdates
    })
  } satisfies OpenRuksakEnvelope;
}

export type { OpenRuksakEnvelope, AgentStatus, GuidanceMode };
