---
id: opp-single-mcp-context-surface
type: opportunity
title: One governed MCP context surface that serves every agent, per-client
status: draft
evidence: researched
delivery: unknown
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: README.md, docs/context-router-build-plan.md, https://dev.to/madeburo/ai-context-management-across-claude-cursor-kiro-gemini-and-custom-agents-2n1f
links:
  addresses: [prob-context-fragmentation, prob-cold-start-reexplain]
  relates_to: [vision, goals, comp-agents-md-standard]
---

## Opportunity
A single source of context exposed over one MCP surface (`open_ruksak` / `update_ruksak_context` /
`create_project_context`) that adapts the same underlying context per client (Codex, Cursor,
Windsurf, default) — replacing the N-drifting-files problem with one queryable store.

## Desired outcome
Switching agent/platform is near-zero-cost: the new agent reads the same fresh context, no
re-explanation, no per-tool file sync. "Time-to-context" for a new agent drops toward zero.

## Why it's worth it
Directly attacks the two best-evidenced pains and the core vision. Differentiates from per-tool
files (AGENTS.md) by being live + queryable + per-client. This is the wedge feature.

## Open assumptions & risks
- Must beat the *free* AGENTS.md baseline on convenience, not just capability.
- Per-client adaptation quality is the make-or-break; partial parity feels worse than one good file.
- Portability alone is commoditising (ContextPool, MCP Backpack) — pair with governance to defend.
