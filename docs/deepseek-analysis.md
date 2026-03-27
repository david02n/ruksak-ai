# DeepSeek Analysis

Ruksak now has a DeepSeek-backed analysis layer for classifying raw input into the existing storage model.

## Purpose

Use `DEEPSEEK_API` to:
- classify raw context input before persistence
- suggest the right destination area
- generate durable titles and summaries
- map raw text into existing `kind_key` and `semantic_role` values

This is designed for:
- proposal-backed write flows
- imports and extraction sessions
- source-link ingestion

It is not meant to replace the current explicit MCP write contract yet.

## Current implementation

Files:
- `/Users/davidbarnes/Documents/Temp/ruksak.ai/src/lib/deepseek.ts`
- `/Users/davidbarnes/Documents/Temp/ruksak.ai/src/lib/context-analysis.ts`

The analysis service returns a structured suggestion with:
- `destination_table`
- `kind_key`
- `semantic_role`
- `entity_type`
- `title`
- `summary`
- `priority`
- `status`
- `confidence`
- `rationale`

Allowed destination tables:
- `entities`
- `proposed_updates`
- `source_links`
- `extraction_sessions`

Allowed kinds / roles:
- `summary`
- `work_item`
- `lesson`
- `decision`
- `reference`

## Safety model

If DeepSeek is unavailable or returns invalid output:
- Ruksak falls back to a deterministic heuristic classifier
- no secrets or raw auth tokens are sent
- the current write path remains unchanged

## Recommended next integration

The best next place to use this is the proposal/extraction flow:
1. raw input arrives
2. analysis suggests destination + structure
3. proposal is created
4. user reviews or auto-confirms depending on mode

That keeps classification flexible without making direct MCP writes unpredictable.
