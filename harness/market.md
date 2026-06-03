---
id: market
type: market
title: AI agent memory / context layer market
status: draft
evidence: researched
created_by: agent
created: 2026-06-03
updated: 2026-06-03
source: >
  https://mem0.ai/series-a, https://mem0.ai/pricing, https://supermemory.ai/pricing/,
  https://agents.md/, https://www.harness.io/blog/the-agent-native-repo-why-agents-md-is-the-new-standard,
  https://www.respan.ai/market-map/compare/mem0-vs-supermemory,
  https://www.producthunt.com/products/contextpool, https://mem0.ai/openmemory
links:
  relates_to: [vision, goals]
---

## Market

A distinct "memory / context layer for AI agents" category formed through 2025–2026, sitting
between the agent platforms (Cursor, Claude Code, Windsurf, Codex) and the work itself.

**Shape & momentum.** Venture money has entered: Mem0 raised ~$24M (Series A led by Basis Set
Ventures, with YC, Peak XV, GitHub Fund) and ships OpenMemory, a shared MCP memory layer for
Cursor/VS Code/Claude. Supermemory raised ~$2.6M (Google/Cloudflare angels) and is positioned
for solo creators/knowledge workers with deep Claude Desktop integration. The category split
into three tiers in early 2026: managed services (e.g. Cloudflare Agent Memory), self-hosted
open source (mem0, agentmemory), and coding-specific MCP plugins (Supermemory, ContextPool).

**The real default — and main competitor — is free and open.** AGENTS.md became the de-facto
cross-tool instruction standard: formalised Aug 2025 (OpenAI, Google, Cursor, Factory,
Sourcegraph), now stewarded by the Agentic AI Foundation under the Linux Foundation, adopted by
60,000+ repos and read natively by Claude Code, Codex CLI, Cursor, Aider, Devin, Copilot,
Gemini CLI, Windsurf, Amazon Q. Reported benefit: 35–55% fewer AI-generated bugs. So the buyer's
baseline is "a markdown file in the repo, for free," not "no solution."

**Buyer & willingness to pay.** Primary buyer (per goals: solo-first, team later) is the
individual developer/builder orchestrating several agents. WTP signal is modest at the solo end:
Mem0 free tier (10k memories) then $19–249/mo; Supermemory free-with-$5-usage then pay-as-you-go.
This means a paid context layer must clear a low free baseline (AGENTS.md) AND a freemium memory
SaaS baseline — pricing power lives in workflow lock-in and governance, not raw storage.

## Where Ruksak sits
The funded incumbents sell **memory** — store facts, semantic recall, embeddings — optimised for
recall. The free standard (AGENTS.md/CLAUDE.md) sells **static instructions**. Neither captures
**decisions and reasoning as durable, governed, queryable context served per-client** — which is
Ruksak's claimed wedge. Validate that this wedge is something solo builders will pay for above the
free file standard.

## Open gaps (needs_user_input / further research)
- No hard data yet on how many solo builders run 3+ agent platforms concurrently (TAM proxy).
- Team/multi-tenant WTP unresearched (deferred per solo-first), but it's likely where real ARPU is.
