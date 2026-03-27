import "server-only";

import { analyzeContextInput } from "@/lib/context-analysis.ts";

export type ContextRoutingPlan = {
  router: "deepseek" | "heuristic";
  confidence: number;
  destinationTable: "entities" | "proposed_updates" | "source_links" | "extraction_sessions";
  entityDraft: {
    kindKey: "summary" | "work_item" | "lesson" | "decision" | "reference";
    semanticRole: "summary" | "work_item" | "lesson" | "decision" | "reference";
    entityType: string;
    title: string;
    summary: string;
    status: string | null;
    priority: string | null;
  };
  sourceLink:
    | {
        sourceType: string;
        sourceUri?: string;
        sourceTitle?: string;
      }
    | null;
  reviewRecommended: boolean;
  rationale: string;
};

export async function routeContextInput(input: {
  rawInput: string;
  requestText?: string;
  projectSlug?: string;
  repo?: string;
  cwd?: string;
}) {
  const analysis = await analyzeContextInput(input);
  const suggestion = analysis.suggestion;
  const sourceLink =
    "source_link" in suggestion && suggestion.source_link
      ? {
          sourceType: suggestion.source_link.source_type,
          sourceUri: suggestion.source_link.source_uri,
          sourceTitle: suggestion.source_link.source_title
        }
      : null;
  const reviewRecommended =
    suggestion.destination_table === "proposed_updates" ||
    suggestion.destination_table === "extraction_sessions" ||
    suggestion.confidence < 0.7;

  return {
    router: analysis.provider,
    confidence: suggestion.confidence,
    destinationTable: suggestion.destination_table,
    entityDraft: {
      kindKey: suggestion.kind_key,
      semanticRole: suggestion.semantic_role,
      entityType: suggestion.entity_type,
      title: suggestion.title,
      summary: suggestion.summary,
      status: suggestion.status ?? null,
      priority: suggestion.priority ?? null
    },
    sourceLink,
    reviewRecommended,
    rationale: suggestion.rationale
  } satisfies ContextRoutingPlan;
}
