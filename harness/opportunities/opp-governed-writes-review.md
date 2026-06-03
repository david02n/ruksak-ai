---
id: opp-governed-writes-review
type: opportunity
title: Governed, proposal-backed writes with a review queue (trust moat)
status: draft
evidence: researched
delivery: unknown
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: README.md, docs/update-risk-policy.md, docs/deepseek-analysis.md
links:
  addresses: [prob-context-trust-rot]
  relates_to: [goals, comp-contextpool]
---

## Opportunity
Classify and risk-rate every write (low/medium/high); route high-risk changes through a
proposal-backed review queue with lightweight admin controls, so the store stays trustworthy as
write volume grows.

## Desired outcome
The context store earns durable trust — users and agents act on it without re-verifying — because
it resists context rot by construction.

## Why it's worth it
This is the defensibility the commoditising portability players (ContextPool, MCP Backpack, free
files) lack. Governance is the moat and a natural paid/team upsell. Partially scaffolded already
(risk classification + DeepSeek/heuristic router exist).

## Open assumptions & risks
- Review friction vs. trust is a tension — too much review and users route around it.
- Value of governance to a *solo* user is unproven (may be a team-tier feature); validate.
