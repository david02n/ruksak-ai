---
id: prob-cold-start-reexplain
type: problem
title: Switching agents/sessions loses context, forcing repeated re-explanation
status: draft
evidence: supported
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: https://www.augmentcode.com/guides/why-ai-coding-tools-make-experienced-developers-19-slower-and-how-to-fix-it, https://www.mindstudio.ai/blog/context-rot-ai-coding-agents-explained, https://vexp.dev/blog/cross-agent-context-share-memory-cursor-claude-code-codex
links:
  relates_to: [vision, comp-contextpool]
---

## Problem
Finite context windows and per-session/per-platform memory mean each new agent or session starts
cold. The user re-supplies architecture, prior decisions, and what was already tried.

## Pain
Who: builders moving between platforms or long-running projects. How often: every session
switch / context reset. How badly: lost flow, repeated explanation, agents re-suggesting fixes
already tried "three exchanges ago"; verification overhead adds ~20% to dev time and contributes
to the measured 19%-slower effect for experienced devs. Workaround: paste long context blocks,
keep a personal scratchpad, or tolerate degraded output.

## Evidence
Multiple sources document context loss, repeated explanation, and context rot with quantified
productivity impact. Supported externally; Ruksak-specific frequency/severity not yet validated.
