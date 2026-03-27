# Ruksak.ai — Product Requirements Document (PRD)
Draft v1.0

## 1. Product Overview

### Product name
**Ruksak.ai**

### One-sentence positioning
**Ruksak.ai is an MCP-first portable context layer that helps AI tools understand a user’s current work, priorities, and relevant history across sessions and platforms.**

### Product vision
People increasingly work across multiple LLMs, agents, and AI-enabled tools. Each tool sees only part of the picture, which leads to repeated explanation, fragmented context, inconsistent outputs, and stale assumptions.

Ruksak exists to solve that problem by maintaining a living, portable layer of user context that can be surfaced across tools, reviewed by the user, and updated over time.

The primary product surface is a Ruksak-owned remote MCP server that AI hosts and tools can connect to directly. A native web UI may exist, but it is a supporting control surface for onboarding, review, inspection, and trust rather than the core product identity.

Ruksak is not primarily a notes app, repo manager, or project tracker. It is a context orchestration system that helps AI tools work with better awareness and less repetition.

---

## 2. Product Scope

### Initial scope
Ruksak is **single-user first**.

The initial product is designed for one individual user managing their own evolving work, projects, priorities, and AI interactions across tools.

### Future scope
Future versions may support:
- shared team context
- workspace-level memory
- role-based and project-based access
- collaborative review and approval flows

These should inform architecture decisions, but are not in v1 scope.

---

## 3. Target Users

### Primary users
AI-native builders and knowledge workers who actively use multiple AI tools, such as:
- founders
- product leaders
- consultants
- developers
- operators
- technical creatives

### Typical environments
These users work across tools such as:
- ChatGPT
- Claude
- Gemini
- Codex
- Cursor
- Windsurf
- custom agents and MCP-enabled tools

### Core problem
Users repeatedly have to explain:
- who they are
- what they’re working on
- their current priorities
- projects and goals
- tools and stack
- collaborators and stakeholders
- recent decisions and learnings
- linked resources and docs

This repetition is costly and causes inconsistent outputs.

Ruksak’s job is to reduce that friction while keeping context relevant, scoped, portable, and under user control.

---

## 4. Core Product Principles

### 4.1 Portable, not platform-bound
Ruksak should work across multiple AI tools and environments. It should not be tied to a single LLM, provider, or UI.

### 4.2 Context should feel alive
Context should evolve over time based on real work and conversations, rather than behaving like static notes.

### 4.3 Observe automatically, save intentionally
Ruksak may continuously detect candidate context from conversations and host environments, but durable updates should only be persisted after user review and approval.

### 4.4 More context is not always better
Context should be filtered, scoped, and bundled to fit the task and host environment. Full dumps should be avoided by default.

### 4.5 Users must be able to see and control what Ruksak knows
Users must be able to inspect, review, edit, merge, archive, and delete durable context.

### 4.6 Storage is not the product
The core value is portable, evolving context. Storage backends and source systems are implementation choices, not the core user-facing identity.

### 4.7 No important durable mutation without a trace
Any important durable change should be attributable, reviewable, and recorded in the system history.

### 4.8 Structure beats blobs
Durable context should be represented as structured entities and relationships, not just raw prose or chat dumps.

### 4.9 What matters now must stay visible
Ruksak should maintain a current-work layer that helps tools and users understand what is active, relevant, and worth attention right now.

---

## 5. Core User Value Proposition

Ruksak should help users:
- avoid repeatedly re-explaining context
- improve the relevance of AI outputs
- keep projects and priorities aligned across tools
- preserve useful decisions and learnings
- maintain continuity across sessions
- stay in control of what becomes durable context

The product succeeds if users feel:
- faster
- better understood
- less repetitive
- more consistent across tools

---

## 6. What Ruksak Is

Ruksak is an MCP-first portable context layer composed of:
- user profile and working style
- current focus and priorities
- active and past projects
- goals and milestones
- tools and workflow context
- linked resources
- recent decisions
- learnings
- scoped context bundles for different hosts and tasks

Ruksak should behave like a structured, living context graph with a clear sense of what matters now.

Its primary expression is a remote MCP server that exposes this context safely to AI hosts and tools. Any native web surface exists to help users set up, review, inspect, and manage that durable context.

---

## 7. What Ruksak Is Not

Ruksak is not:
- primarily a GitHub product
- a mandatory repo-based workflow
- a silent background memory that writes durable truth without review
- a generic notes app
- a project management platform
- a ticketing tool
- a replacement for docs systems or storage platforms

---

## 8. Context Model

Ruksak should distinguish between three states of context.

### 8.1 Ephemeral session context
Context inferred from the active conversation and environment.

Examples:
- likely active project
- likely tech stack
- likely priorities
- likely collaborators
- likely tools and linked resources

This may change quickly and should not automatically become durable.

### 8.2 Candidate durable context
Structured candidate facts or entities that appear worth preserving, but are not yet confirmed.

These should be reviewable by the user before persistence.

### 8.3 Confirmed durable context
Facts and structured entities that have been confirmed by the user or otherwise validated strongly enough to become durable state.

This is the main source used to generate portable context across tools.

### 8.4 Current Work Layer
Ruksak should maintain a distinct layer for what matters now, including:
- active projects
- current priorities
- milestones in motion
- blockers
- pending reviews
- recently changed context

This layer should be easier to inspect and refresh than the full durable history.

---

## 9. Core Domain Objects

Ruksak should maintain structured representations for key entities, including:

### User
- name
- role
- working style
- preferences
- common tools

### Project
- name
- description
- status
- goals
- priorities
- milestones
- risks
- related tools
- related resources

### Tool / Workflow
- type
- provider
- usage relevance
- linked project
- permissions or scope

### Resource
- repo
- page
- board
- document
- URL
- artifact name

### Person
- name
- role
- relationship to project or company

### Company / Organization
- name
- product area
- team context
- strategic relevance

### Learning
- insight
- source session
- related project
- relevance

### Candidate Fact / Proposed Update
- extracted value
- type
- confidence
- related entities
- suggested action

### Relationship
Ruksak should support explicit relationships between entities such as:
- project -> resource
- project -> tool
- project -> person
- project -> milestone
- learning -> project
- company -> project

---

## 10. Continuous Extraction and Review Model

### Product requirement
Ruksak should be able to continuously inspect active conversations and detect likely context signals, but should not silently persist all detected signals as durable truth.

### Extraction model
Ruksak may continuously extract candidate information such as:
- project names
- goals
- milestones
- tech stack
- infrastructure
- ticketing tools
- repositories
- collaborators
- companies
- customers or user segments
- linked documents, URLs, and pages

### Persistence model
Durable updates should follow this flow:
1. extract candidate facts
2. normalize into structured objects
3. compare against durable context
4. group into proposed updates
5. present to the user for review
6. user approves, edits and approves, merges, or dismisses
7. persist approved changes
8. record all resulting changes in the history layer

### User actions on proposed updates
For each proposed update, the user should be able to:
- approve
- edit and approve
- dismiss
- dismiss and avoid similar suggestions where feasible
- merge with an existing entity

### Product stance
Ruksak should favor small, frequent, reviewable updates over occasional full rewrites.

---

## 11. Context Visibility and Control

Ruksak must provide users with a clear way to inspect and manage durable context.

Users should be able to:
- view what Ruksak currently knows
- review proposed updates
- edit stored entries
- merge duplicate entities
- archive or delete stale items
- understand linked sources where relevant
- view when and how something changed

This control surface may be provided through:
- a native Ruksak viewer/editor
- external source-backed views where relevant
- host-environment UI surfaces

The core requirement is strong user visibility and control over persistent context, not a specific storage backend or a web-app-first product model.

---

## 12. System of Record and Change History

### Current state
Ruksak must maintain a durable system of record for confirmed context entities and relationships.

### Change history
Ruksak must also maintain a structured history of changes affecting that record.

Every important creation, update, merge, archival, deletion, approval, dismissal, and source-linking action should be recorded with:
- timestamp
- affected entity
- action type
- actor identity or source
- origin surface or integration
- before/after state where applicable
- session or request reference where feasible

### Actor examples
Actors may include:
- user
- tool
- agent
- backend process
- importer
- sync process

### Purpose
This history should support:
- transparency
- debugging
- attribution
- correction and rollback workflows
- long-term trust

---

## 13. Storage, Sources, and Ingestion

### Managed storage
Ruksak should provide a managed context store by default for fast setup and low friction.

### External source inputs
Ruksak should support ingesting user-provided context from external sources such as:
- GitHub repositories
- Notion pages
- markdown files
- uploaded documents
- pasted text
- structured export files

### External source positioning
External systems are optional inputs and optional control surfaces. They are not the core product identity.

### Import behavior
Imported content should be:
1. ingested
2. parsed
3. mapped into structured Ruksak entities
4. compared against existing context
5. presented for review
6. persisted only after user confirmation

### Source-aware editing
Where durable context is derived from imported or synced sources, Ruksak should preserve source linkage where feasible and make those relationships understandable to the user.

Users should still be able to edit or delete the corresponding Ruksak entries independently.

---

## 14. LLM-Assisted Context Transfer

Modern LLM environments can ingest files, generate files, summarize user history, and present structured content. Ruksak should treat host LLMs not just as consumers of context, but also as onboarding and migration partners.

### Supported intake modes
Ruksak should support:
- direct conversational intake
- file and text intake
- LLM-assisted export/import

### LLM-assisted import example
A user may ask ChatGPT or Claude to:
- summarize their current work
- generate a structured context handoff
- produce markdown or structured export files
- transfer those into Ruksak for review and persistence

### Requirement
LLM-generated imports should be treated as structured draft material, not unquestioned truth. They should still go through review, merge, edit, and dismissal flows before becoming durable context.

---

## 15. Context Provisioning Strategy

Ruksak should not use one universal context blob. Different environments require different shapes.

### 15.1 LLM-facing context
For chat-based reasoning, Ruksak should provide a compressed, semantic brief containing:
- who the user is
- current priorities
- active project context
- recent decisions
- relevant learnings
- scoped task guidance
- refresh hints where relevant

This should be optimized for understanding.

### 15.2 Tool-facing context
For tools and operational workflows, Ruksak should provide typed, scoped, action-oriented context including:
- identifiers
- permissions
- allowed scope
- relevant resources
- operational constraints
- expected input/output contract

This should be optimized for execution.

### 15.3 Retrieval-oriented environments
Where a host already has strong retrieval capabilities, Ruksak should favor:
- lighter summaries
- scoped handles
- linked resources
- on-demand retrieval pathways

rather than large injected blocks.

---

## 16. Context Units

The primary unit of context should be a **Context Bundle**.

A context bundle is:
- scoped to a task or host
- filtered for relevance
- size-controlled
- grounded in confirmed durable context
- optionally enriched with relevant session context

### Examples
- a planning bundle for a product conversation
- a coding bundle for a specific project
- a writing bundle for stakeholder communication
- a review bundle for milestones and risks

### Requirement
Ruksak should never inject the full underlying store by default. It should provide the minimum useful context for the task, plus retrieval pathways when needed.

---

## 17. Workflow-First Interaction Model

Ruksak should be defined primarily by its workflows rather than by a rigid list of explicit commands.

User-facing phrasing may vary by host environment, but should map consistently to a small number of core workflows.

### Persistent user entry points
Helpful surface phrasing may include:
- **Open Ruksak**
- **Check Ruksak**
- **Add to Ruksak**
- **Pack Ruksak**
- **Review contents**
- **Check history**

These should be treated as entry points into workflows rather than the primary product definition.

---

## 18. Core Workflows

### 18.1 First-time setup workflow
Purpose: create the first usable Ruksak profile.

This workflow should:
- gather direct user input
- use current conversation context
- use relevant host LLM memory where supported
- use optional imported materials
- draft an initial structured context profile
- present it for confirmation and editing
- save confirmed context into the system of record
- create initial history entries

### 18.2 Open / Check Ruksak workflow
Purpose: provide a persistent entry point into the system.

This workflow should:
- detect whether the user already has a Ruksak profile
- if not, initiate first-time setup
- if yes, show current durable context summary
- surface active projects, priorities, pending updates, and recent history
- suggest next appropriate actions such as review, import, or update

### 18.3 Update workflow
Purpose: align Ruksak with what appears to have changed.

When a user requests an update, the system should:
- inspect current conversational and environmental context
- extract candidate changes
- compare them against existing durable context
- identify additions, modifications, conflicts, duplicates, and likely stale items
- produce a concise proposed update summary
- let the user confirm, edit, merge, or dismiss
- persist approved changes
- record all resulting changes in the audit/history layer

### 18.4 Review workflow
Purpose: let the user manage pending or recent changes.

This workflow should:
- show proposed updates
- show source signals or reasoning where helpful
- allow approve, edit, merge, dismiss
- group related changes where useful
- make the consequences of approval understandable

### 18.5 Import workflow
Purpose: bring outside context into Ruksak.

This workflow should:
- accept files, text, docs, or LLM-generated handoff packages
- parse and normalize input
- map input into candidate Ruksak entities
- compare against existing context
- show proposed additions and changes
- preserve source linkage where possible
- log the import and resulting changes

### 18.6 Inspect / edit workflow
Purpose: let the user see and manage what Ruksak knows.

This workflow should:
- show durable context clearly
- support search and filtering
- allow edit, merge, archive, delete
- show related sources and relevant history

### 18.7 Provision workflow
Purpose: provide the right context to a host/tool.

This workflow should:
- determine current task and host needs
- select relevant durable context
- optionally enrich with session context
- generate the correct shape for the host
- avoid full dumps by default
- expose refresh and review pathways where needed

### 18.8 History workflow
Purpose: make changes explainable and traceable.

This workflow should:
- show what changed
- when
- by whom or what
- from which surface
- before/after where relevant

---

## 19. Onboarding and Initial Setup

### Core design stance
Initial setup should not require GitHub or any other external source connection.

The product should deliver value quickly through an MCP-connected workflow, then optionally allow users to connect additional sources or control surfaces later.

### Initial profile drafting
Ruksak should generate an initial profile using a combination of:
- direct user input
- the current conversation
- relevant memory or prior context already available to the host LLM environment, where supported
- optional imported sources

The host LLM should be encouraged to summarize what it already knows about the user’s recurring work, projects, priorities, tools, and preferences in a structured onboarding-friendly format.

This summary should be treated as draft input, not confirmed durable truth.

### Confirmation
The user should then review, edit if needed, and confirm the draft profile before it is saved.

---

## 20. First 10-Minute User Experience

The first 10 minutes should focus on one outcome:

**The user should feel that the AI already understands their work better with less repetition.**

### Desired flow
1. user connects or opens Ruksak through a supported MCP-capable host
2. signs in
3. Ruksak checks whether a profile already exists
4. if not, it drafts an initial profile from available signals
5. user confirms or edits the draft, optionally through the supporting web control surface
6. Ruksak becomes available in the host as a connected MCP context service
7. user asks for help on a real task
8. the AI responds with stronger, more specific context awareness
9. Ruksak may suggest reviewing updates or adding important details

### Success criteria
The user should feel:
- setup was light
- context capture was smart but not invasive
- outputs improved quickly
- future sessions will require less repetition

---

## 21. Permissions and Scope

### Chat sessions
Chat-based sessions may have broader permission to read relevant context and propose updates against a user’s durable state.

### Tools and agents
Tools and agents should usually receive narrower, scoped access such as:
- project-specific bundles
- selected resources
- allowed operations
- explicit write boundaries

### Requirement
Ruksak should support permission-aware provisioning so that tools do not automatically receive everything the user knows or stores.

---

## 22. Intelligence Distribution

### Backend / Ruksak core
This is the primary intelligence and system-of-record layer.

Responsibilities:
- parse and normalize context
- extract candidate facts
- maintain the context graph
- build context bundles
- compare session state to durable state
- generate proposed updates
- manage review and persistence flows
- record history and attribution

### MCP / integration layer
This is the primary product surface and distribution layer.

Responsibilities:
- expose Ruksak capabilities to external tools
- provide scoped read/write operations
- support task-appropriate context retrieval
- enforce tool-level permission boundaries
- serve as the main way users experience Ruksak inside AI hosts

### Native control surface
This is a supporting management layer.

Responsibilities:
- handle onboarding and sign-in support
- present review queues and history clearly
- support inspection, editing, merge, archive, and delete workflows
- make trust, attribution, and control legible to the user

### Host LLM environment
This is the interaction layer.

Responsibilities:
- interact with the user
- use bundles and handles
- call Ruksak workflows when needed
- contribute draft summaries from host memory where supported

### Requirement
Ruksak should not rely on host LLMs alone to invent or manage core context logic without structured support.

---

## 23. Learnings Applied from Agent Memory Systems

Ruksak should apply proven patterns from agent-memory systems such as Beads, especially:
- structured persistent memory rather than raw note blobs
- explicit relationships between entities
- a strong current-work layer for what matters now
- frequent lightweight reviewable updates instead of occasional large rewrites
- separation between high-level portable context and richer source materials

Ruksak should not become an issue tracker or a repo-first system. It should stay broader than execution tracking while still using structure and relationships to improve AI usefulness.

---

## 24. Risks and Challenges

### 24.1 Context bloat
Too much context will degrade outputs. Bundling, summarization, and scoped retrieval are essential.

### 24.2 Incorrect extraction
Continuous extraction may produce incorrect candidate facts. Confidence handling and user review are necessary.

### 24.3 Trust and privacy concerns
If Ruksak feels like it silently scrapes and stores everything, users may lose trust. The review model must be obvious.

### 24.4 Stale durable context
Old projects, collaborators, and tools may remain too long and pollute outputs. Ruksak will need lifecycle and recency management.

### 24.5 Integration inconsistency
Different hosts support different levels of memory, retrieval, tool calling, and file handling. Provisioning must adapt accordingly.

---

## 25. Non-Goals for v1

The following are not core goals for v1:
- multi-user collaboration
- full workspace administration
- replacing ticketing systems
- replacing docs tools
- requiring GitHub or markdown workflows for all users
- autonomous durable memory mutation without user review
- turning Ruksak into a full project management system

---

## 26. Product Summary

Ruksak.ai is a single-user-first, MCP-first portable context layer for AI-native work. It helps users carry their current work, priorities, projects, decisions, and relevant history across tools and sessions.

The core product is not GitHub, storage, notes, or a web app. The core product is a Ruksak-owned MCP context service that gives AI systems better context with less repetition and more continuity.

Ruksak should continuously understand, selectively propose, and intentionally persist user context through a review-and-approval model. It should provide an editable system of record, maintain a full history of meaningful changes, support imports from external and LLM-assisted sources, and generate scoped context bundles and MCP-accessible operations tailored to hosts and tasks.

The product should prioritize immediate usefulness, low-friction setup, user trust, portability, and durable control over what the system knows.
