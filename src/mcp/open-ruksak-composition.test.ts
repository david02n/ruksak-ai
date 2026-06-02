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

const candidateReelez = {
  id: "project-reelez",
  name: "Reelez",
  slug: "reelez",
  project_type: "build",
  parent_project_id: null,
  repo: "david02n/reelez",
  root_path: "/Users/davidbarnes/Documents/Temp/reelez",
  score: 62,
  signals: ["request_text_token_overlap"]
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
      id: "work-other",
      title: "Continue social-compliance refactor",
      summary: "Parallel work in another active project.",
      semantic_role: "work_item",
      kind_key: "work_item",
      entity_type: "task",
      provenance_type: "synthesized_context",
      updated_at: "2026-03-22T08:30:00.000Z",
      project_id: "project-reelez",
      project_slug: "reelez",
      project_type: "build",
      parent_project_id: null,
      source_project_id: null,
      source_project_slug: null,
      source_ref: null,
      data: { priority: "medium", status: "active" }
    }
  ],
  lessons: [],
  decisions: [],
  references: [],
  recent_updates: [
    {
      id: "update-1",
      title: "context_item_created event",
      summary: "Codex via mcp",
      created_at: "2026-03-22T08:37:29.017Z"
    }
  ]
};

test("project mode returns focused project metadata", () => {
  const envelope = composeOpenRuksakEnvelope({
    user: baseUser,
    profile: baseProfile,
    resolution: {
      mode: "project",
      focusProjectId: "project-ruksak",
      focusCandidates: [candidateRuksak],
      activePortfolio: [candidateRuksak, candidateReelez],
      confidence: 0.99,
      confidenceLabel: "high",
      resolutionSource: "repo_mapping",
      resolutionExplanation: ["repository matched an existing project"],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: ["repo_mapping"],
        semantic: [],
        affinity: []
      },
      clarificationRequired: false,
      newProjectRecommended: false,
      sessionFocusApplied: false,
      explicitOverrideApplied: false
    },
    structureProfile,
    workspaceUrl: "https://www.ruksak.ai/app",
    generatedAt: "2026-03-22T09:00:00.000Z",
    normalized,
    recentUpdates: normalized.recent_updates,
    storedClientSessionExists: true
  });

  assert.equal(envelope.metadata.context_mode, "project");
  assert.equal(envelope.metadata.focus.project_name, "Ruksak");
  assert.equal(envelope.guidance.mode, "focused_project");
  assert.equal(envelope.inspect.paths.focus_project, "/app?project=ruksak");
});

test("multi-project mode keeps candidate projects without binding one focus", () => {
  const envelope = composeOpenRuksakEnvelope({
    user: baseUser,
    profile: baseProfile,
    resolution: {
      mode: "multi_project",
      focusProjectId: null,
      focusCandidates: [candidateRuksak, candidateReelez],
      activePortfolio: [candidateRuksak, candidateReelez],
      confidence: 0.74,
      confidenceLabel: "medium",
      resolutionSource: "request_text_plurality",
      resolutionExplanation: ["request text implies multiple active projects"],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: [],
        semantic: ["request_text_plurality"],
        affinity: []
      },
      clarificationRequired: false,
      newProjectRecommended: false,
      sessionFocusApplied: false,
      explicitOverrideApplied: false
    },
    structureProfile,
    workspaceUrl: "https://www.ruksak.ai/app",
    generatedAt: "2026-03-22T09:00:00.000Z",
    normalized,
    recentUpdates: normalized.recent_updates,
    storedClientSessionExists: true
  });

  assert.equal(envelope.metadata.context_mode, "multi_project");
  assert.equal(envelope.metadata.focus.project_id, null);
  assert.equal(envelope.metadata.focus_candidates.length, 2);
  assert.equal(envelope.guidance.mode, "multi_project");
});

test("portfolio mode surfaces active portfolio", () => {
  const envelope = composeOpenRuksakEnvelope({
    user: baseUser,
    profile: baseProfile,
    resolution: {
      mode: "portfolio",
      focusProjectId: null,
      focusCandidates: [candidateRuksak],
      activePortfolio: [candidateRuksak, candidateReelez],
      confidence: 0.68,
      confidenceLabel: "low",
      resolutionSource: "portfolio_inference",
      resolutionExplanation: ["request text implies portfolio-level context"],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: [],
        semantic: ["request_text_portfolio"],
        affinity: []
      },
      clarificationRequired: false,
      newProjectRecommended: false,
      sessionFocusApplied: false,
      explicitOverrideApplied: false
    },
    structureProfile,
    workspaceUrl: "https://www.ruksak.ai/app",
    generatedAt: "2026-03-22T09:00:00.000Z",
    normalized,
    recentUpdates: normalized.recent_updates,
    storedClientSessionExists: false
  });

  assert.equal(envelope.metadata.context_mode, "portfolio");
  assert.equal(envelope.orientation.active_portfolio.length, 2);
  assert.equal(envelope.guidance.mode, "portfolio");
});

test("new project candidate mode recommends creation", () => {
  const envelope = composeOpenRuksakEnvelope({
    user: baseUser,
    profile: baseProfile,
    resolution: {
      mode: "new_project_candidate",
      focusProjectId: null,
      focusCandidates: [candidateRuksak],
      activePortfolio: [candidateRuksak],
      confidence: 0.38,
      confidenceLabel: "low",
      resolutionSource: "new_project_candidate",
      resolutionExplanation: ["No existing project matched strongly and the request looks like distinct new work."],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: [],
        semantic: ["request_text_new_context"],
        affinity: []
      },
      clarificationRequired: false,
      newProjectRecommended: true,
      sessionFocusApplied: false,
      explicitOverrideApplied: false
    },
    structureProfile,
    workspaceUrl: "https://www.ruksak.ai/app",
    generatedAt: "2026-03-22T09:00:00.000Z",
    normalized,
    recentUpdates: normalized.recent_updates,
    storedClientSessionExists: false
  });

  assert.equal(envelope.metadata.context_mode, "new_project_candidate");
  assert.equal(envelope.metadata.new_project_recommended, true);
  assert.ok(envelope.guidance.required_approvals.includes("project_create"));
});
