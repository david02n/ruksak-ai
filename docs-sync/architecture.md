# Ruksak.ai — Architecture Plan
Draft v1.0

## 1. Purpose

This document defines the proposed system architecture for Ruksak.ai based on the approved PRD and technical requirements.

It describes:
- the architectural approach for v1
- system components and boundaries
- key data flows
- storage and data model shape
- integration strategy
- operational considerations
- future evolution paths

This plan is intended to be implementation-oriented and Codex-friendly.

---

## 2. Architectural Principles

### 2.1 Modular monolith first
Ruksak v1 should be built as a modular monolith, not as a distributed microservice system.

Reasoning:
- single-user-first scope
- fast iteration
- lower operational complexity
- easier consistency across entity, review, and history flows

Internal modules should still be clearly separated so the system can be split later if needed.

### 2.2 MCP-first, control-surface second
Ruksak v1 should be designed first as a **remote MCP server** that AI hosts and agents connect to directly.

The native web experience should exist as a supporting control surface for:
- onboarding
- review and approval
- durable context inspection
- history and trust workflows

The web product is important, but it is not the primary product identity.

### 2.3 Structured durable state, not transcript persistence
The core system of record should be structured entities and relationships, not raw chats or note blobs.

### 2.4 Review before durable mutation
No important durable change should be applied without a user-facing review path, except for explicitly low-risk metadata updates if introduced later.

### 2.5 Event-backed traceability
All meaningful durable mutations must emit change events into a durable ledger.

### 2.6 Host-aware provisioning
Context generation must adapt to the host:
- chat host
- coding tool / MCP host
- retrieval-capable environment
- native Ruksak UI

### 2.7 Storage-agnostic ingestion
GitHub, Notion, files, pasted text, and LLM-generated handoff packages are all source inputs, not the core system of record.

---

## 3. High-Level Architecture

### 3.1 Main logical components

Ruksak v1 should contain the following core modules:

1. **Remote MCP Server / App Server**
2. **Auth and Identity Module**
3. **Context Store Module**
4. **Entity and Relationship Module**
5. **Extraction Module**
6. **Proposed Update Module**
7. **Review and Mutation Module**
8. **Bundle Generation Module**
9. **Provisioning / Integration Module**
10. **Source Ingestion Module**
11. **History / Change Ledger Module**
12. **File / Artifact Storage Adapter**
13. **Background Job Module**
14. **Control Surface UI**

These can live in one deployable backend in v1.

---

## 4. Deployment Topology

### 4.1 Recommended v1 deployment
Deploy as:
- one MCP/app backend service
- one optional web control-surface app or route group
- one PostgreSQL database
- one object/file storage service
- optional Redis later for caching/queues if needed

### 4.2 Suggested stack
Based on earlier constraints and likely speed of execution:

- **Primary product surface:** TypeScript, Node.js remote MCP server
- **Control surface UI:** TypeScript, React
- **Backend runtime:** TypeScript, Node.js
- **API framework:** Express, Fastify, or NestJS
- **Database:** PostgreSQL
- **ORM/query layer:** Drizzle or Prisma
- **Auth:** OAuth via Google and GitHub
- **Object storage:** S3-compatible storage
- **Deployment:** Railway initially
- **Queue/background jobs:** start in-process or DB-backed; add Redis if needed
- **MCP/integration adapter:** TypeScript service/module inside backend

### 4.3 Why this works
This matches the product need:
- easy to move fast
- supports structured relational data
- fits single-user-first scope
- puts MCP at the center instead of treating it as an afterthought
- still allows a web control surface where trust and review require it

---

## 5. Core Runtime Components

## 5.1 Remote MCP Server / App Server

Responsibilities:
- expose the primary remote MCP interface
- route HTTP/API requests
- authenticate users
- authorize operations
- orchestrate workflows
- expose integration endpoints
- expose frontend-facing endpoints
- enforce ownership and scope

Key interfaces:
- remote MCP endpoints
- auth endpoints
- context manager endpoints
- import endpoints
- review endpoints
- bundle/provision endpoints
- history endpoints
- MCP/tool endpoints

---

## 5.2 Auth and Identity Module

Responsibilities:
- sign in via Google / GitHub
- map external identities to internal user ID
- manage user sessions
- support future multi-identity linking

Core outputs:
- internal stable `user_id`
- session claims
- linked auth identities

Important constraint:
- auth provider choice must not dictate storage model

---

## 5.3 Context Store Module

Responsibilities:
- hold confirmed durable context
- provide query access to current state
- provide mutation hooks through review flow
- expose entity lookups by type, ID, recency, project scope

This is the heart of the system of record.

---

## 5.4 Entity and Relationship Module

Responsibilities:
- create/read/update/archive entities
- manage typed relationships
- support entity merge workflows
- maintain normalized references across domain objects

Key entity groups:
- users
- projects
- tools
- resources
- people
- companies
- learnings
- context bundles
- source links

Key relationship examples:
- project -> resource
- project -> tool
- project -> person
- project -> milestone
- learning -> project
- company -> project

---

## 5.5 Extraction Module

Responsibilities:
- inspect current session text and imported source content
- generate structured candidate facts/entities
- label confidence where possible
- normalize into internal candidate format

Input sources:
- conversation text
- host-provided memory summary
- pasted text
- uploaded files
- LLM-generated import packages
- imported external docs

Implementation approach:
- LLM-based structured extraction
- optional rules/post-processing
- normalization layer to internal candidate schema

Output:
- `candidate_entities`
- `candidate_relationships`
- `candidate_signals`
- extraction session metadata

Important:
- this module must not directly mutate durable state

---

## 5.6 Proposed Update Module

Responsibilities:
- compare extracted candidates with durable context
- detect:
  - additions
  - modifications
  - duplicates
  - conflicts
  - stale entity suggestions
- group changes into user-reviewable proposed updates

This module is where “update Ruksak” actually becomes useful.

Outputs:
- proposed update groups
- concise human-readable summaries
- machine-readable before/after deltas
- merge candidates

---

## 5.7 Review and Mutation Module

Responsibilities:
- present proposed updates
- apply user decisions
- support:
  - approve
  - edit and approve
  - dismiss
  - merge
  - archive/delete where allowed
- persist confirmed changes to durable state
- emit change events

Important:
- this module is the only path for meaningful durable mutations in normal flows

---

## 5.8 Bundle Generation Module

Responsibilities:
- generate task-appropriate context bundles
- adapt to host type and task
- include:
  - durable facts
  - current work layer
  - relevant session enrichment
  - linked resources
- enforce size and relevance constraints

Bundle types:
- LLM brief
- tool context
- retrieval handle bundle
- project bundle
- review bundle

Key logic:
- relevance selection
- recency weighting
- project scope
- host type
- size budget

---

## 5.9 Provisioning / Integration Module

Responsibilities:
- deliver bundles and operations to external hosts
- expose MCP-style tools
- provide host-aware behavior
- support user-facing actions such as:
  - Open Ruksak
  - Check Ruksak
  - Add to Ruksak
  - Review contents
  - Check history

This layer should map natural-language host actions to internal workflows.

Host targets:
- ChatGPT-style app/tool integration
- Claude tool integration
- MCP for coding tools
- future Cursor / Windsurf / Codex / Gemini support

---

## 5.10 Source Ingestion Module

Responsibilities:
- accept external source inputs
- parse and classify them
- preserve source metadata
- route contents to extraction
- create `source_link` records

Supported v1 inputs:
- pasted text
- uploaded markdown/docs
- structured text exports
- GitHub import
- LLM-generated handoff packages

The ingestion module should be pluggable:
- file ingest adapter
- GitHub adapter
- future Notion adapter

---

## 5.11 History / Change Ledger Module

Responsibilities:
- record append-only durable change history
- attribute changes to actor + surface
- support per-entity and global history queries

This module should write `change_event` records for:
- create
- update
- merge
- archive
- delete
- approve/dismiss proposed updates
- import completion
- source linking/unlinking

Important:
- history writes should happen transactionally with durable changes where practical

---

## 5.12 File / Artifact Storage Adapter

Responsibilities:
- store uploaded/imported files
- manage file metadata and references
- support later retrieval or inspection

This should store raw materials, not act as the primary durable context model.

---

## 5.13 Background Job Module

Responsibilities:
- handle non-blocking work
- support:
  - file parsing
  - extraction runs
  - source reprocessing
  - bundle precomputation if needed
  - cleanup tasks
  - stale-context checks

v1 approach:
- start simple
- use synchronous flow where needed for core UX
- move heavier extraction/import tasks into jobs where latency becomes a problem

---

## 5.14 Control Surface UI

Responsibilities:
- first-time setup UX
- current work view
- entity browsing and editing
- proposed update review
- source inspection
- history inspection

The UI should act as the canonical control surface for:
- visibility
- trust
- correction
- manual control

Important:
- this UI is secondary to the MCP product surface
- the UI exists to make durable state reviewable and controllable

---

## 6. Data Architecture

## 6.1 Core storage layers

Ruksak v1 should have four main data layers:

### A. Durable relational store
Stores:
- users
- entities
- relationships
- proposed updates
- source links
- change events
- bundle metadata

### B. Raw source storage
Stores:
- uploaded files
- imported artifacts
- generated handoff packages
- parsing metadata

### C. Ephemeral processing state
Stores:
- in-flight extraction sessions
- comparison jobs
- temporary candidate structures

Can live in DB in v1 if needed.

### D. Derived views
Stores or computes:
- current work view
- recent updates
- active project summaries
- host-specific context bundles

---

## 6.2 Recommended database tables

Suggested initial schema shape:

### `users`
- id
- created_at
- updated_at
- display_name
- primary_email
- status

### `auth_identities`
- id
- user_id
- provider
- provider_user_id
- email
- created_at

### `entities`
Generic durable entity table or typed tables.
Recommended v1: hybrid approach.

Base columns:
- id
- user_id
- entity_type
- status
- title
- summary
- data_json
- created_at
- updated_at
- archived_at

### `entity_relationships`
- id
- user_id
- from_entity_id
- to_entity_id
- relationship_type
- data_json
- created_at
- updated_at

### `proposed_updates`
- id
- user_id
- status
- update_type
- summary
- confidence
- source_session_id
- source_import_id
- created_at
- reviewed_at

### `proposed_update_items`
- id
- proposed_update_id
- target_entity_id nullable
- candidate_entity_json
- before_json
- after_json
- action_kind

### `source_links`
- id
- user_id
- source_type
- source_uri
- source_title
- storage_ref
- imported_at
- metadata_json

### `entity_source_links`
- id
- entity_id
- source_link_id
- relationship_note
- created_at

### `change_events`
- id
- user_id
- entity_id nullable
- proposed_update_id nullable
- action_type
- actor_type
- actor_label
- origin_surface
- before_json
- after_json
- source_link_id nullable
- request_id nullable
- created_at

### `context_bundles`
- id
- user_id
- bundle_type
- host_type
- scope_json
- summary
- bundle_json
- generated_at
- expires_at nullable

### `extraction_sessions`
- id
- user_id
- source_kind
- host_type
- input_ref
- extraction_summary
- created_at

---

## 6.3 Schema design guidance

### Hybrid model
Use:
- normalized core metadata in columns
- flexible fields in `data_json`

This is the right compromise for v1.

### Why not fully generic JSON only
Because you want:
- better querying
- cleaner filtering
- stronger auditing
- less schema chaos

### Why not fully normalized typed tables only
Because iteration speed will suffer too much early on.

---

## 7. Core Workflow Architecture

## 7.1 First-Time Setup Flow

### Goal
Create the initial durable Ruksak profile.

### Flow
1. user authenticates
2. system checks for existing user context
3. if none:
   - collect direct user input
   - gather current conversation context
   - request host memory summary where supported
   - accept optional imports
4. extraction module creates candidate entities
5. proposed update module creates draft initial profile
6. user reviews/edits/confirms
7. review module persists confirmed entities
8. history module records all resulting changes

### Output
- confirmed initial profile
- current work layer populated
- initial history trail

---

## 7.2 Open / Check Ruksak Flow

### Goal
Provide persistent entry to Ruksak.

### Flow
1. user invokes Open/Check Ruksak
2. system checks if profile exists
3. if no profile:
   - redirect to first-time setup
4. if profile exists:
   - query current work layer
   - query active projects
   - query pending proposed updates
   - query recent history
5. return summary plus suggested next actions

---

## 7.3 Update Flow

### Goal
Align durable Ruksak state with current work context.

### Flow
1. user requests update / Add to Ruksak / Pack Ruksak in relevant context
2. system gathers current session text + optional host memory/context
3. extraction module produces candidate facts
4. proposed update module compares candidates vs durable state
5. system groups results into:
   - additions
   - updates
   - conflicts
   - duplicates
   - possible stale items
6. user reviews summary
7. approved changes persist
8. change events are recorded

### Key output
A concise “what changed” summary, not a raw data dump.

---

## 7.4 Import Flow

### Goal
Bring external material into Ruksak safely.

### Flow
1. user submits source
2. source ingestion stores file/text metadata
3. parser extracts raw usable text/content
4. extraction module builds candidate entities
5. proposed update module compares against durable state
6. review flow confirms/edit/merge/dismiss
7. approved changes persist
8. source linkage and change events persist

---

## 7.5 Inspect / Edit Flow

### Goal
Let users see and correct durable context.

### Flow
1. user opens entity or current work view
2. system fetches durable entity + relationships + source links + history
3. user edits/archives/deletes/merges
4. mutation module validates and applies changes
5. history records event

---

## 7.6 Provision Flow

### Goal
Provide the right context to the right host.

### Flow
1. host requests context or internal workflow triggers provisioning
2. system identifies host type and task scope
3. bundle generator queries relevant durable state
4. current work layer is blended in where useful
5. optional session context enrichment is applied
6. host-specific output shape is generated
7. bundle metadata is stored
8. response is returned

---

## 8. Host Integration Architecture

## 8.1 Design approach
Use a unified integration abstraction:

### Core concept
Each host integration should implement:
- host type
- supported capabilities
- auth/session bridging
- memory availability
- file import capability
- tool invocation capability
- output format rules

### Examples
- ChatGPT host adapter
- Claude host adapter
- MCP adapter
- future Gemini adapter

---

## 8.2 Capability matrix
Each host differs on:
- whether it has memory
- whether files can be uploaded
- whether tool calls are available
- whether context is injected or pulled
- whether UI controls are available

The architecture must not hardcode one host model.

---

## 9. Permission and Scope Architecture

## 9.1 v1 permission model
Single-user first, but not single-scope everything.

### Scopes to support:
- full user context
- project-scoped context
- entity-scoped edits
- read-only provision scopes
- limited mutation scopes for integrations

### Example
A chat host may read broad current-work context and propose updates.

A coding tool may only receive:
- one project bundle
- selected resources
- approved write pathways

---

## 9.2 Authorization checks
All mutation operations must validate:
- authenticated user
- ownership of entity/scope
- allowed operation
- origin surface if relevant

---

## 10. Change Ledger Architecture

## 10.1 Event model
Every important durable action should emit a `change_event`.

### Examples
- entity_created
- entity_updated
- entity_merged
- entity_archived
- entity_deleted
- proposed_update_approved
- proposed_update_dismissed
- import_completed
- source_link_added
- source_link_removed

## 10.2 Event writing strategy
Best approach for v1:
- write change event in same transaction as durable mutation where practical
- avoid eventual missing history for critical actions

## 10.3 Why this matters
This supports:
- trust
- debugging
- reversibility later
- history UI
- future analytics

---

## 11. Bundle Generation Architecture

## 11.1 Bundle pipeline
Bundle generation should follow:

1. identify host
2. identify task intent
3. identify project/entity scope
4. query relevant durable state
5. query current work layer
6. optionally blend in session context
7. summarize/shape according to host template
8. apply size constraints
9. return result

## 11.2 Bundle policies
Policies should include:
- max size per host type
- required sections
- preferred recency weighting
- whether raw resource excerpts may be included
- whether only handles should be returned

---

## 12. Background Processing Architecture

## 12.1 What can be synchronous in v1
- sign in
- open/check Ruksak summary
- small extraction runs
- review actions
- simple bundle generation

## 12.2 What should move async if needed
- large file imports
- GitHub repo ingestion
- expensive extraction
- stale context scanning
- bulk reprocessing after schema/prompt changes

## 12.3 v1 job model
Start with:
- backend-triggered tasks
- DB-backed task records
- optional in-process worker

Move to Redis/queue workers only if needed.

---

## 13. Observability and Debuggability

## 13.1 Internal logs
Track:
- extraction started/completed/failed
- import started/completed/failed
- proposed update generated
- proposed update approved/dismissed
- bundle generated
- provisioning request served
- history write failure
- host integration error

## 13.2 Product debugging needs
Internal tooling should make it possible to answer:
- why was this entity created?
- why was this update suggested?
- which source did this come from?
- what was sent to the host?
- why was this bundle chosen?

That is critical for trust.

---

## 14. Failure Modes and Recovery

## 14.1 Likely failure modes
- wrong extraction
- duplicate entities
- stale context
- source parsing failure
- bundle too large / noisy
- host integration mismatch
- history write failure
- partial approval mutation

## 14.2 Recovery strategies
- user review gate before persistence
- merge workflow
- archive instead of hard delete by default
- clear history inspection
- transactional durable writes
- retryable background jobs
- source re-ingest support

---

## 15. Security and Privacy Considerations

### Requirements
- all durable context isolated per user
- imported source access authorized explicitly
- no broad context leakage across integrations
- mutation endpoints protected by auth and ownership checks
- source references only exposed when scoped appropriately

### Product trust principle
Ruksak should feel inspectable and controllable, not opaque.

---

## 16. Evolution Path

## 16.1 Likely near-future extensions
- workspace/shared context
- deeper GitHub/Notion sync
- automatic stale-context detection
- richer bundle tuning per host
- stronger MCP integration
- entity-level rollback tools
- notification/inbox model for proposed updates

## 16.2 Architecture readiness
The modular monolith approach should preserve future extraction of:
- integration service
- bundle service
- ingestion workers
- analytics/audit service

---

## 17. Build Order Recommendation

### Phase 1 — Foundations
- remote MCP server shell
- auth
- user model
- entity store
- relationship store
- change ledger
- basic control-surface shell

### Phase 2 — Core product loop
- first-time setup
- candidate extraction
- proposed updates
- review/approval flow
- current work view

### Phase 3 — Provisioning
- primary MCP tool contract
- bundle generation
- host-aware formatting
- ChatGPT-style remote MCP compatibility where feasible
- open/check Ruksak flow

### Phase 4 — Imports
- pasted text import
- uploaded file import
- LLM-assisted handoff import
- source linkage

### Phase 5 — Advanced control
- merge workflows
- history UI
- archive/delete tools
- GitHub ingest adapter

This is the right sequence because it proves the main MCP value loop before overbuilding secondary surfaces.

---

## 18. Summary

Ruksak v1 should be built as a modular monolith centered on a structured, editable system of record for user context and exposed primarily through a remote MCP server.

The architecture should separate:
- durable context
- candidate extracted context
- reviewable proposed updates
- host-specific provisioning
- append-only change history
- external source ingestion

The system must optimize for:
- low-friction setup
- user trust
- reviewable mutations
- portable context across hosts
- a strong current-work layer
- future extensibility without premature complexity
