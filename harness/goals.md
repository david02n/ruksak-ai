---
id: goals
type: goals
title: Ruksak goals — portable context now, portable harnesses later
status: approved
created_by: agent
approved_by: user
created: 2026-06-03
updated: 2026-06-03
source: README.md, docs/context-router-build-plan.md, user description (2026-06-03), user confirmation (2026-06-03)
links:
  relates_to: [vision]
---

## Goals

1. **Store product context and decisions durably.** Capture decisions, active work items,
   lessons, references, and priorities as persistent, queryable context — not lost in chat
   history or scattered repos.

2. **Serve the right context to any agent, on any platform.** Through a single MCP surface
   (`open_ruksak`, `update_ruksak_context`, `create_project_context`), adapt the same
   underlying context to each client (Codex, Cursor, Windsurf, default) so switching agents
   is quick and seamless and work quality stays consistent.

3. **Keep the context trustworthy.** Classify and risk-rate every write; move high-risk
   changes onto a proposal-backed, reviewable path with a review queue and lightweight admin
   controls, so durable context does not silently degrade.

4. **Be the substrate for what's next.** Provide the portable context foundation that
   Harness Builder (#5) consumes, and lay the path toward portable *harnesses* and Life OS
   (#15) — context first, structured ways-of-working later.

## Primary user (confirmed 2026-06-03)
**Both, solo-first.** Built for the solo builder orchestrating many agents across their own
projects now; designed so a team sharing context is a natural later expansion. Research and
prioritisation weight solo context-portability pain first, while noting team/multi-tenant
expansion paths.

## Open questions for the user
- Is "portable harnesses" a committed roadmap goal or an aspiration? (affects how much of the
  schema/strategy layer to generalise now)
- What is the success metric for "quick and seamless" — time-to-context for a new agent,
  reduction in repeated explanation, or something else?
