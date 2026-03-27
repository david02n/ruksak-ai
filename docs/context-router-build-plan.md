# Context Router Build Plan

## Goal
Move Ruksak from direct durable read/write only toward a safer and more inspectable context system with:

- smarter input routing
- operationally queryable active work
- a minimal authenticated context viewer

## This slice

### 1. Operational storage
- keep the existing hybrid model
- strengthen `entities` with first-class operational fields:
  - `status`
  - `priority`
  - `started_at`
  - `completed_at`
- keep these fields mirrored in normalized output so ranking does not depend on loose JSON only

### 2. Input routing
- add a reusable routing layer on top of the existing DeepSeek/heuristic classifier
- routing decides:
  - destination table
  - kind / semantic role
  - title / summary draft
  - review recommendation
- direct writes can continue for now, but future proposal flows should call this router first

### 3. Context viewing
- add a minimal authenticated control-surface view at `/app`
- reuse the same normalized `open_ruksak` read model instead of inventing a separate UI-only interpretation
- show:
  - current context summary
  - current priorities
  - active work
  - recent decisions
  - recent lessons
  - projects
  - named account contexts

## What this slice does not do
- full proposal-backed review flow
- full dashboard productization
- full agent profile management
- request fingerprinting
- automated lifecycle management for external MCPs

## Next likely slice
- route writes through proposal creation
- add a pending review queue in the UI
- add account-context management
- add project and agent-profile administration
