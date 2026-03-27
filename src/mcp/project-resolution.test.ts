import test from "node:test";
import assert from "node:assert/strict";

import { finalizeProjectResolution } from "./project-resolution-core.ts";

const ruksakProject = {
  id: "project-ruksak",
  name: "Ruksak",
  slug: "ruksak",
  projectType: "build",
  parentProjectId: null,
  repoOwner: "david02n",
  repoName: "ruksak-ai",
  rootPath: "/Users/davidbarnes/Documents/Temp/ruksak.ai",
  description: "MCP-first context service for cross-client retrieval"
};

const userOsProject = {
  id: "project-useros",
  name: "UserOS",
  slug: "useros",
  projectType: "foundation",
  parentProjectId: null,
  repoOwner: "david02n",
  repoName: "useros-mcp",
  rootPath: "/Users/davidbarnes/Documents/Developer/UserOS-MCP-v2",
  description: "Reference MCP server and auth implementation"
};

test("resolves a single strongly matched project without clarification", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject],
    rankedCandidates: [
      {
        project: ruksakProject,
        score: 60,
        signals: ["request_text_exact_project", "request_text_token_overlap"]
      }
    ]
  });

  assert.equal(resolution.projectId, "project-ruksak");
  assert.equal(resolution.clarificationRequired, false);
  assert.equal(resolution.resolutionSource, "request_text_exact_project");
  assert.ok(resolution.resolutionExplanation.length > 0);
  assert.ok(resolution.confidence >= 0.75);
});

test("keeps user-level context when there is no project signal", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject],
    rankedCandidates: []
  });

  assert.equal(resolution.projectId, null);
  assert.equal(resolution.clarificationRequired, false);
  assert.equal(resolution.resolutionSource, "user_level_context");
  assert.equal(resolution.candidateProjects[0]?.slug, "ruksak");
  assert.ok(resolution.recommendedActions.includes("stay_in_user_level_context"));
});

test("requires clarification when candidates are too close", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject, userOsProject],
    rankedCandidates: [
      {
        project: ruksakProject,
        score: 52,
        signals: ["request_text_exact_project", "request_text_token_overlap"]
      },
      {
        project: userOsProject,
        score: 43,
        signals: ["request_text_token_overlap", "session_affinity"]
      }
    ]
  });

  assert.equal(resolution.projectId, null);
  assert.equal(resolution.clarificationRequired, true);
  assert.equal(resolution.candidateProjects.length, 2);
  assert.ok(resolution.recommendedActions.includes("choose_existing_project"));
});

test("allows current project affinity to resolve when it is the only meaningful signal", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject, userOsProject],
    rankedCandidates: [
      {
        project: ruksakProject,
        score: 44,
        signals: ["current_project_affinity", "request_text_token_overlap"]
      },
      {
        project: userOsProject,
        score: 0,
        signals: []
      }
    ]
  });

  assert.equal(resolution.projectId, "project-ruksak");
  assert.equal(resolution.clarificationRequired, false);
  assert.ok(resolution.confidence >= 0.7);
});

test("keeps clarification on when the only signal is affinity toward a build project but the request implies a new foundation", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject, userOsProject],
    rankedCandidates: [
      {
        project: ruksakProject,
        score: 22,
        signals: ["request_text_new_context", "session_affinity"]
      },
      {
        project: userOsProject,
        score: 20,
        signals: ["request_text_project_type_match"]
      }
    ]
  });

  assert.equal(resolution.projectId, null);
  assert.equal(resolution.clarificationRequired, true);
  assert.ok(resolution.recommendedActions.includes("create_new_foundation_or_workstream"));
});
