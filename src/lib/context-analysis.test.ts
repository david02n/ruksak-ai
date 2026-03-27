import test from "node:test";
import assert from "node:assert/strict";

import { heuristicAnalyzeContextInput } from "./context-analysis.ts";

test("heuristic analysis detects decision-like input", () => {
  const result = heuristicAnalyzeContextInput({
    rawInput: "Decision: we should keep reviewable writes and use auto-confirm only temporarily."
  });

  assert.equal(result.provider, "heuristic");
  assert.equal(result.suggestion.kind_key, "decision");
  assert.equal(result.suggestion.destination_table, "entities");
});

test("heuristic analysis detects task-like input", () => {
  const result = heuristicAnalyzeContextInput({
    rawInput: "High priority task: implement agent profiles and project-agent bindings next."
  });

  assert.equal(result.suggestion.kind_key, "work_item");
  assert.equal(result.suggestion.priority, "high");
  assert.equal(result.suggestion.status, "active");
});

test("heuristic analysis routes link-heavy input to source_links", () => {
  const result = heuristicAnalyzeContextInput({
    rawInput: "Reference: https://platform.openai.com/docs/mcp/ should inform the MCP auth contract."
  });

  assert.equal(result.suggestion.kind_key, "reference");
  assert.equal(result.suggestion.destination_table, "source_links");
});
