---
id: prob-context-fragmentation
type: problem
title: Project context is fragmented across per-tool files that drift out of sync
status: draft
evidence: supported
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: https://dev.to/madeburo/ai-context-management-across-claude-cursor-kiro-gemini-and-custom-agents-2n1f, https://medium.com/data-science-collective/the-complete-guide-to-ai-agent-memory-files-claude-md-agents-md-and-beyond-49ea0df5c5a9
links:
  relates_to: [vision, comp-agents-md-standard]
---

## Problem
The same project facts (stack, architecture, conventions, decisions) are duplicated across
CLAUDE.md, .cursorrules, .windsurf/rules/*.md, AGENTS.md and similar — one file per tool.

## Pain
Who: any builder running more than one agent platform (Ruksak's core solo-first user). How often:
continuously. How badly: the files go out of sync and agents give inconsistent, contradictory
suggestions; the human becomes the manual sync mechanism. Current workaround: hand-copy edits
across N files, or accept drift.

## Evidence
Documented directly: "these nine different files describe the same thing… but go out of sync,
resulting in inconsistent agent suggestions." Cross-agent context guides exist specifically to
fight this. Supported by external write-ups, not yet validated with Ruksak users.
