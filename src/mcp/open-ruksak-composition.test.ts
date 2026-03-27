import test from "node:test";
import assert from "node:assert/strict";

import { composeOpenRuksakEnvelope } from "./open-ruksak-composition.ts";

const structureProfile = {
  id: "structure-1",
  slug: "ruksak_standard_v0_1",
  version: "0.1",
  name: "Ruksak Standard"
};

const baseUser = {
  displayName: "David Barnes",
  primaryEmail: "david@example.com"
};

const baseProfile = {
  key: "codex",
  profile: "codex_v1" as const,
  source: "explicit_hint" as const,
  label: "codex_v1"
};

const candidateRuksak = {
  id: "project-ruksak",
  name: "Ruksak",
  slug: "ruksak",
  project_type: "build",
  parent_project_id: null,
  repo: "david02n/ruksak-ai",
  root_path: "/Users/davidbarnes/Documents/Temp/ruksak.ai",
  score: 98,
  signals: ["repo_mapping", "cwd_root_path"]
};

const normalized = {
  summary: [
    {
      id: "summary-project",
      title: "Ruksak current state",
      summary: "Ruksak is working natively in Codex and the next work is reviewable writes and agent profiles.",
      semantic_role: "summary",
      kind_key: "summary",
      entity_type: "summary",
      provenance_type: "synthesized_context",
      updated_at: "2026-03-22T08:37:27.936Z",
      project_id: "project-ruksak",
      project_slug: "ruksak",
      project_type: "build",
      parent_project_id: null,
      source_project_id: null,
      source_project_slug: null,
      source_ref: null,
      data: {}
    },
    {
      id: "summary-operator",
      title: "Operator profile: David Barnes",
      summary: "Pragmatic, utilitarian, and focused on practical progress.",
      semantic_role: "summary",
      kind_key: "summary",
      entity_type: "summary",
      provenance_type: "strategic_doctrine",
      updated_at: "2026-03-20T10:00:00.000Z",
      project_id: null,
      project_slug: null,
      project_type: null,
      parent_project_id: null,
      source_project_id: null,
      source_project_slug: null,
      source_ref: null,
      data: {}
    }
  ],
  work_items: [
    {
      id: "work-high",
      title: "Introduce proposal-backed reviewable writes",
      summary: "Route writes through proposals first.",
      semantic_role: "work_item",
      kind_key: "work_item",
      entity_type: "task",
      provenance_type: "synthesized_context",
      updated_at: "2026-03-22T08:37:28.312Z",
      project_id: "project-ruksak",
      project_slug: "ruksak",
      project_type: "build",
      parent_project_id: null,
      source_project_id: null,
      source_project_slug: null,
      source_ref: null,
      data: { priority: "high", status: "active" }
    },
    {
      id: "work-medium",
      title: "Document current MCP surface",
      summary: "Write internal docs for the current tools and flows.",
      semantic_role: "work_item",
      kind_key: "work_item",
      entity_type: "task",
      provenance_type: "operating_rule",
      updated_at: "2026-03-21T18:00:00.000Z",
      project_id: "project-ruksak",
      project_slug: "ruksak",
      project_type: "build",
      parent_project_id: null,
      source_project_id: null,
      source_project_slug: null,
      source_ref: null,
      data: { priority: "medium", status: "active" }
    }
  ],
  lessons: [
    {
      id: "lesson-1",
      title: "Prompt-only opens are weaker than repo/cwd inference",
      summary: "Use repo and cwd signals strongly where available.",
      semantic_role: "lesson",
      kind_key: "lesson",
      entity_type: "learning",
      provenance_type: "synthesized_context",
      updated_at: "2026-03-22T07:00:00.000Z",
      project_id: "project-ruksak",
      project_slug: "ruksak",
      project_type: "build",
      parent_project_id: null,
      source_project_id: null,
      source_project_slug: null,
      source_ref: null,
      data: {}
    }
  ],
  decisions: [
    {
      id: "decision-1",
      title: "Use Ruksak directly in Codex during development",
      summary: "Use the mounted MCP to reduce drift.",
      semantic_role: "decision",
      kind_key: "decision",
      entity_type: "decision",
      provenance_type: "meta_system_design",
      updated_at: "2026-03-22T08:37:28.661Z",
      project_id: "project-ruksak",
      project_slug: "ruksak",
      project_type: "build",
      parent_project_id: null,
      source_project_id: null,
      source_project_slug: null,
      source_ref: null,
      data: {}
    }
  ],
  references: [
    {
      id: "reference-1",
      title: "OpenAI MCP docs",
      summary: "Reference for ChatGPT and remote MCP behavior.",
      semantic_role: "reference",
      kind_key: "reference",
      entity_type: "reference",
      provenance_type: "source_material",
      updated_at: "2026-03-21T18:00:00.000Z",
      project_id: "project-ruksak",
      project_slug: "ruksak",
      project_type: "build",
      parent_project_id: null,
      source_project_id: "project-ruksak",
      source_project_slug: "ruksak",
      source_ref: { url: "https://platform.openai.com" },
      data: {}
    }
  ],
  recent_updates: [
    {
      id: "update-1",
      title: "context_item_created event",
      summary: "Codex via mcp",
      created_at: "2026-03-22T08:37:29.017Z"
    }
  ]
};

test("first-time chatgpt session stays in safe orientation mode", () => {
  const envelope = composeOpenRuksakEnvelope({
    user: baseUser,
    profile: {
      key: "chatgpt",
      profile: "codex_v1",
      source: "explicit_hint",
      label: "codex_v1"
    },
    resolution: {
      projectId: null,
      confidence: 0.42,
      resolutionSource: "user_level_context",
      resolutionExplanation: ["No project signals were strong enough to resolve a project."],
      resolutionSignalBreakdown: { explicit: [], environment: [], semantic: [], affinity: [] },
      recommendedActions: ["stay_in_user_level_context", "create_new_project"],
      candidateProjects: [candidateRuksak],
      clarificationRequired: true
    },
    structureProfile,
    workspaceUrl: "https://www.ruksak.ai/app",
    generatedAt: "2026-03-22T09:00:00.000Z",
    normalized,
    recentUpdates: normalized.recent_updates,
    storedClientSessionExists: false
  });

  assert.equal(envelope.agent_status.is_registered, false);
  assert.equal(envelope.guidance.mode, "unregistered_agent_safe_mode");
  assert.equal(envelope.metadata.resolved_project.id, null);
  assert.ok(envelope.orientation.likely_projects.length > 0);
  assert.ok(envelope.guidance.required_approvals.includes("agent_registration"));
});

test("returning chatgpt session reopens likely project with light confirmation behavior", () => {
  const envelope = composeOpenRuksakEnvelope({
    user: baseUser,
    profile: {
      key: "chatgpt",
      profile: "codex_v1",
      source: "explicit_hint",
      label: "codex_v1"
    },
    resolution: {
      projectId: "project-ruksak",
      confidence: 0.82,
      resolutionSource: "session_affinity",
      resolutionExplanation: ["recent session history points here"],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: [],
        semantic: [],
        affinity: ["session_affinity"]
      },
      recommendedActions: ["open_existing_project"],
      candidateProjects: [candidateRuksak],
      clarificationRequired: false
    },
    structureProfile,
    workspaceUrl: "https://www.ruksak.ai/app",
    generatedAt: "2026-03-22T09:00:00.000Z",
    normalized,
    recentUpdates: normalized.recent_updates,
    storedClientSessionExists: true
  });

  assert.equal(envelope.agent_status.is_registered, true);
  assert.equal(envelope.metadata.resolved_project.name, "Ruksak");
  assert.equal(envelope.metadata.resolved_project.confidence, "medium");
  assert.equal(envelope.guidance.mode, "medium_confidence_confirm");
  assert.equal(envelope.inspect.workspace_url, "https://www.ruksak.ai/app");
});

test("codex repo scenario reopens likely project and ranks current work ahead of operator background", () => {
  const envelope = composeOpenRuksakEnvelope({
    user: baseUser,
    profile: baseProfile,
    resolution: {
      projectId: "project-ruksak",
      confidence: 0.99,
      resolutionSource: "repo_mapping",
      resolutionExplanation: ["repository matched an existing project"],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: ["repo_mapping"],
        semantic: [],
        affinity: []
      },
      recommendedActions: ["open_existing_project"],
      candidateProjects: [candidateRuksak],
      clarificationRequired: false
    },
    structureProfile,
    workspaceUrl: "https://www.ruksak.ai/app",
    generatedAt: "2026-03-22T09:00:00.000Z",
    normalized,
    recentUpdates: normalized.recent_updates,
    storedClientSessionExists: true
  });

  assert.equal(envelope.guidance.mode, "high_confidence_auto_open");
  assert.equal(envelope.context.current_priorities[0]?.title, "Introduce proposal-backed reviewable writes");
  assert.match(String(envelope.context.current_context_summary[2]), /Ruksak current state/);
  assert.match(String(envelope.context.current_context_summary[3]), /Operator profile/);
  assert.equal(envelope.context.grouping_summary.by_provenance_type.source_material, 1);
});

test("unregistered weak-context agent offers likely projects or new-project path", () => {
  const envelope = composeOpenRuksakEnvelope({
    user: baseUser,
    profile: {
      key: "unknown-client",
      profile: "default_v1",
      source: "fallback",
      label: "default_v1"
    },
    resolution: {
      projectId: null,
      confidence: 0.18,
      resolutionSource: "user_level_context",
      resolutionExplanation: ["No project signals were strong enough to resolve a project."],
      resolutionSignalBreakdown: { explicit: [], environment: [], semantic: [], affinity: [] },
      recommendedActions: ["stay_in_user_level_context", "create_new_project"],
      candidateProjects: [],
      clarificationRequired: true
    },
    structureProfile,
    workspaceUrl: "https://www.ruksak.ai/app",
    generatedAt: "2026-03-22T09:00:00.000Z",
    normalized,
    recentUpdates: normalized.recent_updates,
    storedClientSessionExists: false
  });

  assert.equal(envelope.guidance.mode, "unregistered_agent_safe_mode");
  assert.ok(envelope.guidance.required_approvals.includes("project_create"));
  assert.ok(envelope.guidance.required_approvals.includes("context_write"));
  assert.ok(envelope.guidance.clarifications_needed.includes("confirm_or_create_project"));
});
