---
id: prob-context-trust-rot
type: problem
title: Unmanaged agent writes degrade the trustworthiness of stored context
status: draft
evidence: supported
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: https://www.mindstudio.ai/blog/context-rot-ai-coding-agents-explained, https://standardbeagle.com/ai-coding-assistants-and-context/, docs/update-risk-policy.md
links:
  relates_to: [vision, goals]
---

## Problem
When agents can write to shared context freely, low-quality or conflicting entries accumulate.
Output quality drops as irrelevant/outdated context is pulled in — "context rot."

## Pain
Who: anyone relying on the stored context downstream (the user, every agent reading it). How often:
grows with write volume. How badly: a context store that silently degrades is worse than none —
agents confidently act on stale/wrong context. Workaround: manual curation/pruning, or distrust the
store and re-supply context anyway (which defeats the purpose).

## Evidence
Context rot is externally documented. Ruksak already encodes a response: write risk classification
(low/medium/high) and a move toward proposal-backed review (docs/update-risk-policy.md, README).
Supported; the *degree* to which governance changes user trust is unvalidated.
