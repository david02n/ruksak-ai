# Harness Node Schema & Convention (v0)

The harness is **markdown files living in the repo**. Git is the storage, versioning, and
diff layer — no platform required. One folder, `harness/`, holds the product reasoning as a
graph of small nodes. Humans and agents read and extend the same files.

Two goals this serves:
1. **Clear view of where everything is** — `harness/INDEX.md` is a generated rollup.
2. **Persistent thinking** — every decision/problem/option is a durable file an agent (or you) can pick up later.

---

## Why a graph, not a table
A spreadsheet cell can't hold one-to-many. The real shape is:

```
Vision / Goals / Market   (one each per repo)
        │
     Problem ──addressed by──▶ Opportunity ──realized by──▶ Solution (often several, competing)
                                                                  │
                                                          Decision (picks one, records why)
```

Each Problem can spawn several Opportunities; each Opportunity several competing Solutions;
a Decision records which Solution won and why. That fan-out is exactly what broke the matrix.

---

## Folder layout
```
harness/
  SCHEMA.md            ← this file (dropped in by the skill so the repo is self-describing)
  vision.md            ← singleton
  goals.md             ← singleton
  market.md            ← singleton
  problems/            prob-<slug>.md
  opportunities/       opp-<slug>.md
  solutions/           sol-<slug>.md
  decisions/           dec-<slug>.md
  assumptions/         asm-<slug>.md   (optional)
  risks/               risk-<slug>.md  (optional)
  tasks/               task-<slug>.md  (optional — the agent-handoff / backlog layer)
  INDEX.md             ← GENERATED rollup; never hand-edit
```

`id` = `<type-prefix>-<short-slug>`, unique within the repo. Prefixes:
`vision goals market | prob opp sol dec | asm risk task`.

---

## Node frontmatter (YAML)
Every node file starts with:

```yaml
---
id: opp-one-click-listing
type: opportunity        # vision|goals|market|problem|opportunity|solution|decision|assumption|risk|task
title: One-click listing from a single photo
status: draft            # draft|needs_user_input|researching|ready_for_review|approved|superseded|archived
evidence: assumption     # assumption|researched|supported|validated|invalidated  (omit for vision/goals/task)
created_by: agent        # agent|user   ← human-authored or human-approved nodes are protected (see skill)
created: 2026-06-02
updated: 2026-06-02
source: README.md, src/pipeline/listing.ts   # where the agent inferred this from (files/urls)
links:                   # typed graph edges to other node ids
  addresses: [prob-listing-backlog]     # opportunity → problems it tackles
  realized_by: [sol-vision-pricing, sol-template-prompts]  # opportunity → candidate solutions
  chosen: sol-vision-pricing            # decisions only
  rejected: [sol-template-prompts]      # decisions only
  relates_to: []                        # generic link
---
```

Then a short markdown body. Keep one node per file; keep it tight.

### Status lifecycle
`draft` → `needs_user_input` → `researching` → `ready_for_review` → `approved`
(`rejected` / `superseded` / `archived` are terminal). **Agents only ever write `draft` or
`needs_user_input`.** Only a human promotes a node to `approved`.

### Evidence levels
`assumption` (a guess) → `researched` → `supported` → `validated` (proven) / `invalidated`.
Treating guesses and validated facts the same produces bad decisions — so this field is required
on problem/opportunity/solution/decision nodes.

---

## Body templates (the shape only — fill on the repo)

**vision.md / goals.md / market.md** — prose or short bullets. Goals as a numbered list.

**problems/prob-*.md**
```
## Problem
<objective situation>
## Pain
<who feels it, how often, how badly; current workaround>
## Evidence
<source links / observations, or "assumption">
```

**opportunities/opp-*.md**
```
## Opportunity
<statement — maps back to a real pain, not a random idea>
## Desired outcome
## Why it's worth it
<commercial value / strategic fit>
## Open assumptions & risks
```

**solutions/sol-*.md**  (expect several per opportunity)
```
## Solution
<feature / workflow / automation / prompt / integration / experiment>
## How it scores
<feasibility · value · complexity · time-to-learn — vs the other candidate solutions>
## Trade-offs
```

**decisions/dec-*.md**
```
## Decision
<which solution chosen>
## Alternatives considered
<the rejected sol- nodes and why>
## Rationale & evidence
## Reversal conditions
```

**tasks/task-*.md** (optional, agent handoff)
```
## Task
<build-ready unit — acceptance criteria so another agent can execute without hidden context>
## Depends on
```

---

## The rollup (`INDEX.md`)
Generated, never hand-edited. Two parts:
1. **Graph tree** — Problems → Opportunities → Solutions → Decision, as a nested list of titles + ids.
2. **Status table** — every node with its `status` and `evidence`, so gaps (`needs_user_input`,
   `assumption`) are visible at a glance.

A later cross-repo rollup just scans every repo's `harness/INDEX.md` to rebuild the portfolio
tracker automatically — so the hand-maintained tracker becomes a generated read-model.
