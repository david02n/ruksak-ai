import test from "node:test";
import assert from "node:assert/strict";

import { classifyContextUpdateRisk } from "./update-risk.ts";

test("task status updates are low risk", () => {
  const result = classifyContextUpdateRisk({
    action: "update",
    kindKey: "work_item",
    existingStatus: "active",
    nextStatus: "done",
    existingSummary: "Implement proposal-backed writes.",
    nextSummary: "Implement proposal-backed writes."
  });

  assert.equal(result.riskLevel, "low");
  assert.equal(result.requiresExplicitApproval, false);
});

test("priority changes are medium risk", () => {
  const result = classifyContextUpdateRisk({
    action: "update",
    kindKey: "work_item",
    existingPriority: "medium",
    nextPriority: "high"
  });

  assert.equal(result.riskLevel, "medium");
  assert.equal(result.reviewRecommended, true);
});

test("materially changing core summary is high risk", () => {
  const result = classifyContextUpdateRisk({
    action: "update",
    kindKey: "summary",
    existingSummary: "Validate the core retrieval loop.",
    nextSummary: "Shift the company toward a services business."
  });

  assert.equal(result.riskLevel, "high");
  assert.equal(result.requiresExplicitApproval, true);
});

test("creating a project-scoped work item can stay low risk", () => {
  const result = classifyContextUpdateRisk({
    action: "create",
    kindKey: "work_item",
    nextSummary: "Add current project viewer."
  });

  assert.equal(result.riskLevel, "low");
});

test("creating a new project is high risk", () => {
  const result = classifyContextUpdateRisk({
    action: "create",
    kindKey: "work_item",
    projectCreated: true,
    nextSummary: "Start a brand new project."
  });

  assert.equal(result.riskLevel, "high");
  assert.equal(result.requiresExplicitApproval, true);
});
