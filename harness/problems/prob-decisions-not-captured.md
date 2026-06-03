---
id: prob-decisions-not-captured
type: problem
title: Decisions and the "why" behind them aren't captured as durable context
status: draft
evidence: researched
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: https://www.respan.ai/market-map/compare/mem0-vs-supermemory, https://mem0.ai/openmemory, README.md
links:
  relates_to: [vision, comp-mem0-openmemory, comp-supermemory]
---

## Problem
Existing tools store facts/memories for recall but not the *reasoning trail* — which option was
chosen, what was rejected, and why. The "why" stays in chat logs and people's heads.

## Pain
Who: the builder (and any future agent or teammate) revisiting a project weeks later. How often:
every time a past decision is questioned or an agent proposes something already rejected. How badly:
silently re-litigated decisions, repeated mistakes, no durable rationale to point an agent at.
Workaround: dig through old chat transcripts, or re-derive.

## Evidence
Inferred from the competitor landscape: funded incumbents (Mem0/OpenMemory, Supermemory) are
explicitly framed as *memory/recall* of facts; none center decisions+rationale as first-class,
governed nodes. Ruksak's own model already distinguishes `decision` and `lesson` kinds (README).
This is a researched gap, not yet validated as a felt pain with users — confirm via interviews.
