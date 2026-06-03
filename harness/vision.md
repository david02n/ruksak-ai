---
id: vision
type: vision
title: Portable context (and later, portable harnesses) across every agent platform
status: approved
created_by: agent
approved_by: user
created: 2026-06-03
updated: 2026-06-03
source: README.md, docs/context-router-build-plan.md, docs/deepseek-analysis.md, user description (2026-06-03), user confirmation (2026-06-03)
links:
  relates_to: []
---

## Vision

Working across multiple agents, environments, and workspaces, it is hard to keep the right
information in front of each agent. Context lives in scattered repos, chat logs, tools, and
people's heads, so every agent starts cold and produces inconsistent work.

**Ruksak is a portable context layer for AI-native work.** It stores a product's durable
context — decisions, work items, lessons, references, and the reasoning behind them — once,
and serves the right slice of it to any agent on any platform (Codex, Cursor, Windsurf,
Claude, and others) through a single MCP surface. The goal is that moving between agent
platforms stays quick and seamless while the quality of the work stays high, because every
agent picks up the same well-maintained context instead of rebuilding it.

Near term, Ruksak makes **context** portable. Longer term, it makes **harnesses** portable —
becoming the substrate that Harness Builder (#5) and Life OS (#15) build on, so not just the
facts but the structured way-of-working travels with you across tools.

## What it is not (for now)
- Not another agent or IDE — it is the shared memory the agents read from and write to.
- Not a dumping ground — writes are classified, risk-rated, and (for high-risk changes)
  proposal-backed and reviewable, so the context stays trustworthy.
