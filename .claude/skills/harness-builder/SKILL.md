---
name: harness-builder
description: >
  Generate or refresh a project "harness" — a graph of product-reasoning nodes (vision, goals,
  market, problems, opportunities, competing solutions, decisions) stored as markdown in the
  repo's harness/ folder. Use this whenever the user wants to map a codebase into product nodes,
  build/update a harness, "read the repo and create nodes", capture product thinking as files,
  or produce a structured view of where a project stands so agents or the user can pick it up
  later. Trigger even if they don't say the word "harness" — any request to turn a repo's code
  and docs into a structured, persistent product map should use this skill.
---

# Harness Builder

Turns a repository into a graph of small, durable product-reasoning nodes that live in
`harness/` and travel with the code. Read `references/node-schema.md` first — it defines the
node types, frontmatter, folder layout, and the Problem→Opportunity→Solution→Decision graph.
Everything below is the generation workflow.

## Core principles (do not violate)
1. **Agents write `draft` or `needs_user_input` only.** Never write `status: approved`. Only the human promotes.
2. **Never modify or overwrite a node where `created_by: user` OR `status: approved`.** That's protected human thinking. If a new finding conflicts, create a *new* node and link `relates_to`/supersede it — never clobber.
3. **Don't invent evidence.** If you can't ground a claim in a file/doc, set `evidence: assumption` and/or `status: needs_user_input`, and say so. Flag gaps; do not paper over them.
4. **Cite sources.** Every generated node records the file(s)/path(s) it was inferred from in `source`.
5. **One node per file. Keep nodes short.** The value is structure, not prose volume.

## Workflow

### 1. Set up / locate the harness
- If `harness/` doesn't exist, create it and copy `references/node-schema.md` to `harness/SCHEMA.md` so the repo is self-describing.
- If it exists, load every existing node first and **build a map of protected nodes** (`created_by: user` or `status: approved`). You will not touch those.

### 2. Survey the repo (evidence-gathering, no writing yet)
Read, in roughly this order: `README*`, `/docs`, `package.json` / `pyproject.toml` / manifest,
top-level directory names, main entrypoints, notable `TODO`/`FIXME` comments, and recent commit
messages (`git log --oneline -30`). Aim to answer: what is this, who's it for, what problems does
it tackle, what approaches exist in the code. Note the source file for each inference.

### 3. Draft the singletons
Create/refresh `vision.md`, `goals.md`, `market.md` (skip any that are protected). `status: draft`.

### 4. Extract Problems → `problems/prob-*.md`
One node per distinct pain found in docs/issues/comments/code. Map problem vs pain per the schema.

### 5. Draft Opportunities → `opportunities/opp-*.md`
For each problem, one or more opportunities, linked `addresses: [prob-...]`. Opportunities must
map back to a real problem — no free-floating ideas.

### 6. Draft competing Solutions → `solutions/sol-*.md`
Where the code, branches, or docs show more than one possible approach, create **multiple**
solution nodes per opportunity and link `realized_by`. Capturing the competition is the point.

### 7. Decisions → `decisions/dec-*.md`
Only where there's real evidence a choice was made (the approach actually in the code). Record
`chosen` / `rejected`. Where the code doesn't reveal a decision, create a decision node with
`status: needs_user_input` listing the open options for the human.

### 8. Optional layers
- `assumptions/` & `risks/` where code/docs imply them (`evidence: assumption`).
- `tasks/` — turn clear TODOs / obvious next steps into build-ready task nodes with acceptance criteria, for agent pickup.

### 9. Regenerate `INDEX.md`
Overwrite `harness/INDEX.md` with (a) the graph tree (Problems→Opps→Solutions→Decision, titles+ids)
and (b) a status table of every node with `status` and `evidence`.

### 10. Report, don't commit silently
Print a summary: counts by node type, and an explicit list of every `needs_user_input` gap and
every `assumption`-level node, so the human knows exactly what to fill or validate. Stage the
files but let the human review and commit (don't auto-push).

## After generation (human loop)
The human edits/corrects nodes and promotes good ones to `status: approved` / `created_by: user`.
Re-running this skill respects those and only refreshes the rest. That promotion step is what
keeps auto-generated drafts from masquerading as validated thinking.

## Scope note
Run on **one repo at a time**. A cross-repo portfolio rollup (scanning every repo's
`harness/INDEX.md`) is a separate, later step — don't attempt it here.
