---
name: harness-discovery
description: >
  Research and build the STRATEGY layer of a project harness — product vision, goals, market
  context, competitive landscape, problems/pains, and opportunities — grounded in real evidence.
  Use this in Cowork whenever the user wants market research, a competitive landscape, to find or
  validate customer pains, to map opportunities, or to establish/refresh the "why" of a product.
  It validates and corrects existing strategy nodes if they exist, or does greenfield research if
  they don't. Trigger even if they don't say "harness" — any request to work out a product's market,
  pains, or opportunities, or to pressure-test the strategy behind a repo, should use this skill.
  Pairs with the delivery skill (harness-builder) via the opportunity node.
---

# Harness Discovery (Skill A · Cowork)

Produces the **research-derived strategy layer** of a harness: `vision`, `goals`, `market`,
`competitors/`, `problems/`, `opportunities/`. It works from research and the user — **not by
reading code**. Read `references/node-schema.md` first for node types, frontmatter, and the
Problem → Opportunity contract. The delivery skill (Claude Code) later reads each opportunity and
stamps a `delivery:` verdict — this skill never does.

## Core principles (do not violate)
1. **Vision & goals are the anchor — establish them before any research (Step 1, mandatory).** Everything downstream is judged against them. Researching pains/opps against a missing or unconfirmed vision produces confidently-wrong strategy.
2. **Cite real evidence. Never invent a pain.** Every problem/opportunity records its source (web page, review, interview, ticket, the user). Honest `evidence` level — `assumption` until something external supports it. A research skill that fabricates findings is worse than none.
3. **Agents write `draft` / `needs_user_input` only.** Never `approved`. Only the human promotes.
4. **Never overwrite a node that is `created_by: user` or `status: approved`.** Propose changes as a new linked node or a note — never clobber human-validated thinking.

## Step 1 — Establish the anchor (vision + goals). Do this first, always.
Load `harness/vision.md` and `harness/goals.md` if present, then branch:
- **Confirmed** (`status: approved` or `created_by: user`) → use as-is. Proceed.
- **Only an agent draft** (`status: draft`, `created_by: agent`) → **stop and surface them to the user.** Show the drafted vision/goals and ask: "Is this right? Correct it before I research against it." Do not treat an agent guess as ground truth.
- **Absent** → draft a *candidate* vision + goals from whatever evidence exists (README, docs, the user's description, this conversation), present them plainly, and ask the user to confirm or correct. Mark `status: needs_user_input` until they do.

Only once vision + goals are confirmed by the user do you continue. This gate is the whole point — it's what protects older/sparse projects from being researched against a hallucinated premise.

## Step 2 — Inventory existing strategy nodes (validate vs greenfield)
List any existing `market`, `competitors/`, `problems/`, `opportunities/` nodes.
- **Some exist →** you are in *validate/correct* mode: treat each as a hypothesis to test against fresh research, not as truth.
- **None exist →** *greenfield* mode: research and create them from scratch.
Build the protected-node map (approved/user) — those you may challenge but never edit.

## Step 3 — Market context + competitive landscape
Web research (and any available connectors — the user's notes, tickets, CRM) to write `market.md`
and `competitors/*` nodes: market size/trend, who the buyer is, willingness to pay, regulation,
and the real competitor set with their positioning and gaps. Cite every claim. Evidence: typically
`researched` → `supported`.

## Step 4 — Problems / Pains
Derive pains from evidence — reviews, forums, support themes, interviews the user can supply,
competitor complaints, market reports. For each: who feels it, how often, how badly, current
workaround, and the **source**.
- *Validate mode:* check each existing problem against evidence. Confirm (raise evidence), correct
  (amend, note what changed, keep `draft` for re-review), or supersede (new node, mark old `superseded`).
- *Greenfield:* create `problems/prob-*.md`.
Never leave a pain at `validated` without an external source. A pain with no evidence stays `assumption` and is flagged.

## Step 5 — Opportunities
Map each opportunity back to one or more validated problems (`addresses: [prob-...]`). No
free-floating ideas. Record desired outcome, why it's worth it, open assumptions/risks, evidence.
Set the contract field **`delivery: unknown`** on every opportunity — the delivery skill fills it
later (`not_started` | `partial` | `addressed`). This skill never guesses delivery status.

## Step 6 — Regenerate the index & report
Regenerate `harness/INDEX.md` from all nodes present (preserve any delivery-layer nodes — don't
delete them). Then report:
- What you **confirmed / corrected / created / superseded**, with new evidence levels.
- Every `needs_user_input` item — especially any unconfirmed vision/goals and any pain still at `assumption`.
- The 3–5 highest-leverage opportunities by evidence + value, so the user knows where the real signal is.

## Volume & restraint
Prefer fewer, higher-evidence nodes. Rough caps for a first pass: 3–7 problems, 1–3 opportunities
per problem, 3–6 competitors. Beyond that you're padding — flag gaps as `needs_user_input` instead
of inventing filler to hit a number. A thin honest strategy beats a fat speculative one.

## Scope
One product at a time. While a product ≈ one repo, the nodes live in that repo's `harness/`. When a
product spans repos (or has none), the strategy layer belongs in a central store (e.g. Ruksak) —
but that's a later migration, not this skill's job.
