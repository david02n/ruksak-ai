# Ruksak.ai — Technical Requirements
Draft v1.0

## 1. Purpose

This document translates the Ruksak.ai PRD into an implementation-oriented technical requirements specification suitable for engineering planning and Codex-driven execution.

It defines:
- system scope
- required capabilities
- core architecture constraints
- data model expectations
- integration requirements
- workflow requirements
- operational and non-functional requirements

This document is intentionally more concrete than the PRD, but not yet a full architecture plan.

---

## 2. Product and System Summary

Ruksak.ai is a portable context layer for AI-native work.

### Product posture correction
Ruksak v1 should be treated as **MCP-first, not web-app-first**.

The primary product surface is a Ruksak-hosted remote MCP server that exposes portable context workflows to AI hosts and tools.

The web product in v1 is a **secondary control surface** for onboarding, review, inspection, and trust, not the primary product identity.

The system must:
- maintain a durable, user-editable system of record for context
- continuously extract candidate context from conversations and connected sources
- compare candidate context against durable context
- generate reviewable proposed updates
- provision scoped context to LLMs, tools, and agents
- preserve change history and attribution for all important durable mutations

Ruksak is single-user first in v1.

---

## 3. Technical Goals

### 3.1 Primary technical goals
The system must:
- support low-friction initial setup
- support cross-tool context portability
- avoid full-context dumping by default
- maintain structured durable context rather than raw transcript memory
- support review-before-persist workflows
- expose clear read/write/update operations to host environments
- preserve full auditability of durable changes

### 3.2 Secondary technical goals
The system should:
- support source ingestion from multiple systems
- support host-assisted onboarding and import flows
- allow future expansion to multi-user/workspace models
- allow storage and source integrations to remain pluggable

---

## 4. v1 Scope

### In scope
- single-user accounts
- managed Ruksak context store
- Google and/or GitHub authentication
- official Ruksak-hosted remote MCP server as the primary product surface
- MCP-first workflows for ChatGPT, Claude, Codex, Cursor, Windsurf, and other MCP-capable hosts
- initial context profile drafting
- host-memory-assisted onboarding where available
- conversation-driven candidate extraction
- user review / approve / edit / dismiss / merge workflows
- editable context manager as a secondary control surface
- context bundle generation
- scoped context provisioning
- change history / audit trail
- external source ingestion via file/text import
- optional GitHub ingestion as a source input
- MCP/tool integration surface for supported hosts

### Out of scope
- multi-user collaboration
- shared team context
- advanced role-based access control
- full project management features
- replacing docs/ticketing platforms
- autonomous durable mutation without review
- broad sync support across many SaaS tools in v1

---

## 5. High-Level System Requirements

The system must consist of the following logical capabilities:

1. **Identity and session management**
2. **Remote MCP server / integration surface**
3. **Durable context store**
4. **Context extraction pipeline**
5. **Proposed update engine**
6. **Review and approval engine**
7. **Context manager / editor**
8. **Context bundle generator**
9. **Provisioning and integration layer**
10. **Change ledger / audit history**
11. **Source ingestion and linkage layer**

These may be implemented within one deployable service in v1, but should remain logically separable.

---

## 6. Functional Requirements

## 6.1 Authentication and User Identity

### Requirements
- The system must support authenticated user accounts.
- The system must support sign-in via at least one mainstream auth provider in v1.
- Preferred providers for v1 are:
  - Google
  - GitHub
- Each user must have one primary durable Ruksak context space in v1.
- The system must maintain an internal stable user ID independent of auth provider identity.
- The system must support linking multiple external identities to one internal user in future, even if not fully exposed in v1.

### Notes
Authentication should not imply GitHub is required as a storage backend.

---

## 6.2 Initial Setup and Profile Drafting

### Requirements
On first-time use, the system must be able to create an initial context profile using a combination of:
- direct user input
- current conversation context
- host LLM memory/context where available
- imported files or pasted content where provided

### Behavior
- The system must generate a draft initial profile.
- The system must clearly separate inferred content from confirmed durable content.
- The user must be able to review and edit the draft before confirmation.
- No draft profile should become durable until user confirmation.

### Initial profile should support at least:
- user name
- role
- working style / preferences
- current projects
- current priorities
- common tools
- relevant company/org context where available

---

## 6.3 Durable Context System of Record

### Requirements
The system must maintain a structured durable context store for confirmed user context.

The durable store must support:
- entities
- relationships between entities
- current state
- source references where applicable
- timestamps
- soft deletion / archival
- editability

### Required properties
- Durable state must be user-inspectable.
- Durable state must be editable.
- Durable state must be queryable by workflow and host integration layers.
- Durable state must be separable from ephemeral session context and candidate context.

---

## 6.4 Context States

The system must represent at least three distinct context states:

### 1. Ephemeral Session Context
- context inferred from active conversations and current host environment
- temporary and non-authoritative
- may be recomputed frequently

### 2. Candidate Durable Context
- normalized structured facts/entities inferred from sessions or imported sources
- not yet confirmed
- reviewable by user

### 3. Confirmed Durable Context
- approved and persisted
- used for context provisioning and future comparisons

The system must not conflate these layers.

---

## 6.5 Current Work Layer

### Requirements
The system must maintain a distinct “current work” view optimized for what matters now.

This layer must support:
- active projects
- current priorities
- milestones in motion
- blockers
- pending proposed updates
- recently changed important context

### Notes
This may be implemented as a query/view over durable entities plus recency metadata, rather than a fully separate storage system.

---

## 6.6 Core Entity Types

The durable context model must support at least the following entity types in v1:

- User
- Project
- Tool
- Resource
- Person
- Company / Organization
- Learning
- Proposed Update
- Source Link
- Context Bundle
- Change Event

### Minimum project fields
- id
- name
- description
- status
- goals
- priorities
- milestones
- risks
- related resources
- related tools
- updated_at
- archived_at nullable

### Minimum learning fields
- id
- summary
- related project(s)
- source reference
- created_at
- updated_at

### Minimum resource fields
- id
- type
- title
- uri or external reference
- linked entity references
- source origin
- created_at
- updated_at

---

## 6.7 Relationships

### Requirements
The system must support explicit typed relationships between entities.

Examples:
- project -> resource
- project -> tool
- project -> person
- project -> milestone
- project -> company
- learning -> project
- resource -> source system

### Notes
Relationship records should be first-class enough to be queryable and auditable.

---

## 6.8 Source Ingestion

### Requirements
The system must support external source ingestion in v1 through:
- pasted text
- uploaded files
- structured LLM-generated handoff content
- optional GitHub-backed source import

### Source ingestion flow
1. accept source input
2. parse source content
3. extract candidate entities/facts
4. compare with existing durable context
5. group results into proposed updates
6. present to user for review
7. persist approved changes
8. log the source and resulting changes

### Additional requirements
- The system must preserve source linkage where feasible.
- Imported content must not automatically overwrite durable state.
- Users must be able to inspect imported-derived entries and remove them later.

---

## 6.9 LLM-Assisted Context Transfer

### Requirements
The system must accept context handoff inputs generated by host LLMs.

These inputs may include:
- structured summaries
- markdown files
- JSON-like structured payloads
- pasted export packages
- uploaded generated files

### Behavior
- The system must parse these into candidate structured data.
- The system must treat them as draft material, not authoritative truth.
- These imports must still go through the same review/persist workflow.

---

## 6.10 Candidate Extraction from Conversations

### Requirements
The system must be able to extract candidate context signals from active conversational inputs.

### Candidate extraction should support at least:
- project names
- priorities
- goals
- milestones
- stack/tools
- infra/services
- collaborators
- resources
- organizations
- learnings/decisions

### Notes
This can be implemented using LLM-based structured extraction, rule-based post-processing, or a hybrid approach.

### Constraints
- Extraction must not directly mutate durable state.
- Extraction must produce confidence-aware candidate objects where possible.
- Extraction should be repeatable and idempotent enough for regular use.

---

## 6.11 Proposed Update Engine

### Requirements
The system must compare candidate structured context against confirmed durable context and generate reviewable proposed updates.

### Proposed updates must support:
- additions
- modifications
- merges
- potential duplicates
- stale-item suggestions
- deletions or archival suggestions where appropriate

### Each proposed update should contain:
- update type
- affected entity/entity candidates
- proposed before/after change summary
- confidence score or confidence label if available
- related source references
- related extraction session or import reference
- status (pending / approved / dismissed / merged / superseded)

---

## 6.12 Review and Approval Workflow

### Requirements
Users must be able to act on proposed updates using at least:
- approve
- edit and approve
- dismiss
- merge with existing
- archive or delete where relevant

### Behavior
- Approval must persist the durable change.
- Edit and approve must persist the edited version, not the raw candidate.
- Dismiss must keep a trace in history.
- Merge actions must preserve lineage/auditability.
- Approved or dismissed updates must not remain ambiguously pending.

---

## 6.13 Context Manager / Editor

### Requirements
The product must include a user-visible context management surface.

This surface must allow users to:
- browse durable context
- inspect entity detail
- inspect linked sources where available
- edit entities
- merge duplicates
- archive/delete stale entries
- inspect current work view
- inspect pending proposed updates
- inspect change history

### Notes
This may initially be exposed through a web UI, host-app UI, or both.

---

## 6.14 Change Ledger / Audit History

### Requirements
The system must maintain a durable append-oriented change ledger for important durable actions.

### Logged actions must include at least:
- create
- update
- merge
- archive
- delete
- approve proposed update
- dismiss proposed update
- create source link
- remove source link
- import completed

### Each change event must record:
- event_id
- timestamp
- entity_type
- entity_id or candidate reference
- action_type
- actor_type
- actor_label or actor_id where available
- origin_surface
- before state when applicable
- after state when applicable
- related request/session/source reference where feasible

### Actor types must support at least:
- user
- tool
- agent
- backend
- importer
- sync process

---

## 6.15 Context Provisioning

### Requirements
The system must generate scoped context outputs suitable for different host environments.

### Supported provisioning shapes
1. **LLM-facing brief**
2. **Tool-facing operational context**
3. **Retrieval-oriented handle/bundle**

### LLM-facing brief must support:
- user identity summary
- current priorities
- active project context
- relevant recent decisions
- relevant learnings
- task-specific notes
- refresh hints when appropriate

### Tool-facing operational context must support:
- user ID / context space ID
- task/project scope
- allowed operations
- resource references
- permissions
- constraints

### Retrieval-oriented output must support:
- light summary
- linked relevant resources
- project/entity references
- scoped access handles

### Constraints
- The system must not inject the full durable store by default.
- Provisioning must be relevance-scoped.
- Provisioning should be host-aware.

---

## 6.16 Context Bundles

### Requirements
The system must generate task-scoped context bundles.

### Bundle properties
Each bundle should support:
- bundle ID
- bundle type
- host type
- related project/entity scope
- summary
- included facts/entities
- included references/resources
- generated_at
- freshness marker or staleness metadata

### Bundle generation should consider:
- current task intent
- current host/tool
- recency
- confirmed durable state
- relevant session context
- bundle size constraints

---

## 6.17 Open / Check Ruksak Workflow

### Requirements
The system must support a persistent entry workflow for users to access Ruksak.

### Behavior
When a user opens/checks Ruksak:
- if no profile exists, the system must initiate first-time setup
- if a profile exists, the system must show current context summary
- it should also surface:
  - active projects
  - current priorities
  - pending updates
  - recent changes/history
  - suggested next actions

---

## 6.18 Update Workflow

### Requirements
The system must support an update workflow that aligns current conversation/environment context with durable Ruksak state.

### Update workflow must:
1. inspect current available context
2. extract candidate changes
3. compare against durable state
4. identify:
   - additions
   - modifications
   - conflicts
   - duplicates
   - likely stale entries
5. generate a concise update summary
6. present review options
7. apply approved changes
8. log all changes

This workflow is one of the core product flows.

---

## 6.19 History Workflow

### Requirements
The system must support inspecting history at:
- global account level
- entity level
- update/proposed-update level where feasible

The system should enable users to answer:
- what changed?
- when?
- by whom or what?
- from which surface?
- what was the previous value?

---

## 7. Integration Requirements

## 7.1 Host Integration Surfaces

v1 should be designed to support:
- ChatGPT app/tool style integration
- Claude-compatible tool/memory flow
- MCP-compatible integration for coding environments
- future-compatible integration paths for Gemini, Cursor, Windsurf, Codex

### Requirement
The integration model must not assume all hosts support the same:
- memory access
- file upload model
- tool calling
- retrieval
- UI surfaces

Integration logic must be host-adaptive.

---

## 7.2 MCP Requirements

### Requirements
The MCP/integration layer must expose enough operations to support the product workflows.

The MCP layer should be treated as the **primary external interface** for v1.

The first-class requirement is not simply “support MCP somewhere”; it is to operate a Ruksak-owned remote MCP server that AI hosts can connect to directly.

Likely required operations include:
- get current Ruksak summary
- get current work view
- get context bundle
- import context source
- propose updates from current session
- review pending updates
- approve/dismiss/update proposed changes
- create/update/edit/delete entities
- inspect change history

The initial contract should also be compatible with remote-MCP-style host integrations where practical, including clear read pathways and task-scoped fetch/search style operations when a host expects them.

### Notes
The external action naming can remain user-friendly and host-adaptive, but underlying operations must be explicit and predictable.

---

## 8. Data Storage Requirements

### v1 storage requirements
The system requires:
- relational durable store for entities and history
- support for JSON/document fields where useful
- file/object storage for uploaded source materials where needed
- ability to store source linkage metadata

### Recommended baseline
- PostgreSQL for durable structured data
- object storage for raw uploaded/imported files
- optional cache layer if needed later

### Data classes to persist
- users
- auth identities
- entities
- relationships
- proposed updates
- context bundles metadata
- source links
- change events
- imports / extraction sessions
- preferences / settings

---

## 9. API / Service Requirements

### General
The system must expose stable application-facing interfaces for:
- remote MCP operations
- auth/session initiation
- context read/write
- workflow execution
- review actions
- bundle generation
- history retrieval
- source import

### API design constraints
- APIs must be idempotent where practical
- entity mutation endpoints must validate ownership and scope
- review actions must be explicit
- destructive actions should prefer archive/soft-delete in v1 where appropriate

---

## 10. Non-Functional Requirements

## 10.1 Performance
- Common read operations should feel responsive for interactive use.
- First summary/open experience after login should be fast enough for conversational workflows.
- Bundle generation should be optimized for interactive use, even if some deeper recomputation is deferred.

## 10.2 Reliability
- Durable context writes must be transactional.
- Approval workflows must not result in ambiguous partial state.
- History logging for important actions should be strongly consistent with durable state changes.

## 10.3 Security
- User data must be isolated per user in v1.
- External source access must require explicit user authorization.
- The system must not expose full context to tools without scope checks.
- Sensitive imported content should not be exposed beyond approved provisioning pathways.

## 10.4 Auditability
- Durable changes must be attributable.
- History must be queryable.
- Source-derived context must preserve provenance where feasible.

## 10.5 Extensibility
- The entity model should support future entity additions.
- The integration layer should support additional hosts without redesigning the whole platform.
- The storage model should support future multi-user/workspace evolution.

---

## 11. UX and Product Behavior Constraints

### Requirements
- The product must not feel like it is silently scraping and storing everything.
- The review step must be obvious and understandable.
- The system should prefer concise summaries over noisy data dumps.
- Users must always be able to inspect and correct important durable state.
- Commands and actions in host environments should remain plain-language and workflow-oriented.

---

## 12. Observability Requirements

The system should emit internal logs/metrics for:
- extraction runs
- import runs
- proposed update generation
- approval and dismissal events
- bundle generation
- provisioning calls
- history write failures
- integration errors

This is needed for debugging and trust.

---

## 13. v1 Suggested Implementation Boundaries

For v1, the system may be implemented as a modular monolith with:
- remote MCP server layer
- API layer
- auth layer
- entity/context service
- extraction/proposed-update service
- bundle/provisioning service
- history service
- source ingestion service
- integration/MCP adapter layer

This should be structured so it can later be split if needed.

---

## 14. Open Technical Questions

These require resolution in architecture planning:

1. What exact entity schema and relationship model should be used in v1?
2. How should confidence scoring be represented and surfaced?
3. How should stale context detection work?
4. What exact bundle-generation strategy should be used per host?
5. How should host memory inputs be normalized when hosts differ widely?
6. What should be soft-deleted vs hard-deleted in v1?
7. What exact MCP/tool contract should be exposed first?
8. How should the remote MCP server align with ChatGPT-style remote MCP expectations and tool shapes?
9. How should uploaded/imported source files be stored and referenced?
10. What should be computed synchronously vs asynchronously?

---
