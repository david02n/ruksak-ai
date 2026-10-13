---
id: opp-ceo-delegation-loop
type: opportunity
title: CEO delegation loop - review plans, delegate delivery, verify against hidden checks
status: draft
evidence: supported
delivery: unknown
created_by: agent
created: 2026-10-11
updated: 2026-10-13
source: prob-decision-overload, docs/review-loop-build-plan.md
links:
  addresses: [prob-decision-overload, prob-context-trust-rot]
  relates_to: [opp-governed-writes-review, opp-portable-harness-substrate, goals]
---

## Opportunity
Turn Ruksak into the operating loop for one person running an AI org. David makes four
decisions and the org does the rest:

| David (CEO) | Claude, model plus harness (the org) |
|---|---|
| Provide direction and vision | Ideate ways to achieve goals |
| Set goals | Understand direction and vision; seek to validate and invalidate |
| Align plans | Create plans under guidance and known preferences |
| Approve progress | Deliver on plans |

Plans are always reviewable. Delivery is delegated to named skills or agent prompts, and only
outputs marked for review come back. A separate pass checks every delivered item against an
acceptance check the builder never saw.

## Desired outcome
David delegates problems at the moment he spots them and trusts they're solved correctly, so
his time goes on decisions, not delivery.

## Why it's worth it
- It extends a surface David already uses and finds helpful: the Perchpeek actions review page.
- It reuses Ruksak's existing auth, MCP and hosting. The review loop needs no database: git is
  the version history and the notes file is the review state.
- Hidden acceptance checks turn "governed writes" into a trust mechanism for delegation, not
  just for writes.

## Open assumptions and risks
- An LLM grading against a rubric is weaker than a real test. Prefer hard checks where they're possible.
- The surface must not turn into a third workspace to look after. It's a pane opened from a link.
- GitHub is the only store, so work content never rests on 02N infrastructure. A pass still runs on David's personal Max token.

See `docs/review-loop-build-plan.md` for the build plan.
