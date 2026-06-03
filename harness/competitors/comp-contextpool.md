---
id: comp-contextpool
type: competitor
title: ContextPool (and file-based peers: agent-context, MCP Backpack)
status: draft
evidence: researched
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: https://www.producthunt.com/products/contextpool, https://medium.com/codex/introducing-mcp-backpack-persistent-portable-memory-for-ai-coding-agents-87eea16eaa54, https://dev.to/madeburo/ai-context-management-across-claude-cursor-kiro-gemini-and-custom-agents-2n1f
links:
  relates_to: [market, prob-cold-start-reexplain]
---

## Competitor
The coding-agent-specific cohort closest to Ruksak's framing. ContextPool scans past Cursor/Claude
Code sessions, extracts insights (bugs, fixes, design decisions, gotchas) and loads them via MCP at
session start. agent-context: file-based, git-versioned, human-readable, no vectors/embeddings/keys,
works across Claude Code, Cursor, Copilot CLI, Windsurf, Codex. MCP Backpack: simple portable
"remember what I was working on / move context between machines."

## Positioning
"Persistent, portable memory for coding agents." Several are free / OSS, file-or-MCP based.

## Gap Ruksak can exploit
Closest conceptually — but framed as **session memory / portability**, mostly auto-extracted, not a
**deliberately curated, governed product-context + strategy graph** with risk-rated writes and a
review queue. Crowded, fast-moving space: Ruksak's defensibility must be the governance + harness
substrate, not portability alone (which is becoming commoditised).
