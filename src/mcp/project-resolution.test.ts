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

test("resolves a single strongly matched project", () => {
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

  assert.equal(resolution.mode, "project");
  assert.equal(resolution.focusProjectId, "project-ruksak");
  assert.equal(resolution.clarificationRequired, false);
  assert.ok(resolution.confidence >= 0.75);
});

test("keeps user-level context when there is no project signal", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject],
    rankedCandidates: []
  });

  assert.equal(resolution.mode, "user");
  assert.equal(resolution.focusProjectId, null);
  assert.equal(resolution.activePortfolio[0]?.slug, "ruksak");
});

test("uses multi-project mode when candidates are close", () => {
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

  assert.equal(resolution.mode, "multi_project");
  assert.equal(resolution.focusProjectId, null);
  assert.equal(resolution.focusCandidates.length, 2);
});

test("does not force project mode from affinity alone", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject, userOsProject],
    rankedCandidates: [
      {
        project: ruksakProject,
        score: 24,
        signals: ["current_project_affinity", "session_affinity"]
      }
    ]
  });

  assert.equal(resolution.mode, "portfolio");
  assert.equal(resolution.focusProjectId, null);
});

test("returns new project candidate when distinct new work is implied", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject, userOsProject],
    rankedCandidates: [
      {
        project: ruksakProject,
        score: 22,
        signals: ["request_text_new_context", "session_affinity"]
      }
    ],
    newProjectLikely: true
  });

  assert.equal(resolution.mode, "new_project_candidate");
  assert.equal(resolution.newProjectRecommended, true);
});

test("returns portfolio mode for broad portfolio requests", () => {
  const resolution = finalizeProjectResolution({
    userProjects: [ruksakProject, userOsProject],
    rankedCandidates: [
      {
        project: ruksakProject,
        score: 36,
        signals: ["request_text_token_overlap"]
      }
    ],
    portfolioLikely: true
  });

  assert.equal(resolution.mode, "portfolio");
  assert.equal(resolution.focusProjectId, null);
});
