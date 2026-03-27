# Update Risk Policy

## Goal
Let agents capture routine context changes without interrupting active work, while still protecting high-risk changes.

## Core rule
- write routinely
- review asynchronously
- interrupt only for high-risk structural changes

## Risk levels

### Low risk
Examples:
- update task status
- add a new work item
- add a lesson
- add a reference
- add a decision note
- append recent working-state context

Expected handling:
- auto-captured
- durable and versioned
- does not interrupt the user

### Medium risk
Examples:
- change task priority
- revise project summary wording
- change current priorities
- edit an existing decision
- reclassify an item into a different kind

Expected handling:
- auto-captured
- review recommended
- user can amend later in the product or through the LLM

### High risk
Examples:
- create a new project from weak evidence
- materially change goals or core summary
- change account-context provenance
- perform identity/binding registration changes
- destructive overwrite of important context

Expected handling:
- explicit approval required
- should not auto-apply silently

## Current implementation posture
- low-risk updates can remain flow-friendly
- medium-risk updates should be easy to review and amend
- high-risk updates should eventually route through proposal confirmation

## Current code hooks
- classifier: [src/lib/update-risk.ts](/Users/davidbarnes/Documents/Temp/ruksak.ai/src/lib/update-risk.ts)
- current MCP write path: [src/mcp/open-ruksak.ts](/Users/davidbarnes/Documents/Temp/ruksak.ai/src/mcp/open-ruksak.ts)

This policy is intended to become the gating layer for proposal-backed writes.
