import "server-only";

import type { OpenRuksakEnvelope } from "@/mcp/open-ruksak-composition";
import type { ResolvedClient } from "@/mcp/project-resolution";

function itemLimit(profile: ResolvedClient["profile"]) {
  switch (profile) {
    case "codex_v1":
      return 6;
    case "cursor_v1":
      return 5;
    case "windsurf_v1":
      return 8;
    default:
      return 5;
  }
}

function buildClientBrief(profile: ResolvedClient["profile"], envelope: OpenRuksakEnvelope) {
  const lines = [
    envelope.metadata.resolved_project.name
      ? `Resolved project: ${envelope.metadata.resolved_project.name}`
      : "Project context is unresolved; user-level orientation returned.",
    `Active work items: ${envelope.context.active_work_items.length}`,
    `Recent lessons: ${envelope.context.recent_lessons.length}`,
    `Recent updates: ${envelope.context.recent_updates.length}`
  ];

  switch (profile) {
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

export function adaptContextForClient(input: {
  profile: ResolvedClient;
  envelope: OpenRuksakEnvelope;
}) {
  const limit = itemLimit(input.profile.profile);

  return {
    ...input.envelope,
    metadata: {
      ...input.envelope.metadata,
      candidate_projects: input.envelope.metadata.candidate_projects.slice(0, limit)
    },
    orientation: {
      user_priorities: input.envelope.orientation.user_priorities.slice(0, Math.min(3, limit)),
      likely_projects: input.envelope.orientation.likely_projects.slice(0, limit)
    },
    context: {
      current_context_summary: input.envelope.context.current_context_summary.slice(0, limit),
      active_work_items: input.envelope.context.active_work_items.slice(0, limit),
      current_priorities: input.envelope.context.current_priorities.slice(0, Math.min(3, limit)),
      recent_lessons: input.envelope.context.recent_lessons.slice(0, limit),
      decisions: input.envelope.context.decisions.slice(0, limit),
      references: input.envelope.context.references.slice(0, limit),
      recent_updates: input.envelope.context.recent_updates.slice(0, limit),
      suggested_next_actions: input.envelope.context.suggested_next_actions.slice(0, Math.min(4, limit))
    },
    guidance: {
      ...input.envelope.guidance,
      instructions: input.envelope.guidance.instructions.slice(0, 4),
      required_approvals: input.envelope.guidance.required_approvals.slice(0, 4),
      clarifications_needed: input.envelope.guidance.clarifications_needed.slice(0, 4)
    },
    client_brief: buildClientBrief(input.profile.profile, input.envelope)
  };
}
