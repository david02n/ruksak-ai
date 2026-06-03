---
id: comp-agents-md-standard
type: competitor
title: AGENTS.md / CLAUDE.md file convention (the free default)
status: draft
evidence: supported
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: https://agents.md/, https://developers.openai.com/codex/guides/agents-md, https://www.harness.io/blog/the-agent-native-repo-why-agents-md-is-the-new-standard
links:
  relates_to: [market, prob-context-fragmentation]
---

## Competitor
The open, tool-agnostic markdown instruction file standard. AGENTS.md (formalised Aug 2025;
Linux Foundation / Agentic AI Foundation steward) plus tool-specific CLAUDE.md, .cursorrules,
.windsurf/rules — read natively by ~all major agents. 60,000+ repos.

## Positioning
"A README for agents." Free, in-repo, version-controlled, zero infra. The baseline every paid
product must beat.

## Gap Ruksak can exploit
Static instructions, not living context — captures conventions, not decisions/work-state/lessons.
Multiple per-tool files drift out of sync (the fragmentation pain). No querying, no per-client
adaptation, no write governance, no cross-repo rollup. Ruksak can position as "the same
git-friendly markdown ethos, but a queryable, governed, multi-agent context graph."
