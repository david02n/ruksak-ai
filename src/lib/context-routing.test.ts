import test from "node:test";
import assert from "node:assert/strict";

import { routeContextInput } from "./context-routing.ts";

test("routes straightforward work input into an entity draft and keeps review recommended on low-confidence heuristics", async () => {
  const result = await routeContextInput({
    rawInput: "High priority task: tighten project resolution and improve current-work retrieval."
  });

  assert.equal(result.destinationTable, "entities");
  assert.equal(result.entityDraft.kindKey, "work_item");
  assert.equal(result.entityDraft.priority, "high");
  assert.equal(result.entityDraft.status, "active");
  assert.equal(result.reviewRecommended, true);
});

test("routes link-heavy input into a source-link plan", async () => {
  const result = await routeContextInput({
    rawInput: "Reference: https://platform.openai.com/docs/mcp/ should guide the public submission path."
  });

  assert.equal(result.destinationTable, "source_links");
  assert.equal(result.entityDraft.kindKey, "reference");
});
