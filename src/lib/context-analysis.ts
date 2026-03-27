import "server-only";

import { callDeepSeekJson, isDeepSeekConfigured } from "@/lib/deepseek.ts";

const ALLOWED_KIND_KEYS = ["summary", "work_item", "lesson", "decision", "reference"] as const;
const ALLOWED_SEMANTIC_ROLES = ["summary", "work_item", "lesson", "decision", "reference"] as const;
const ALLOWED_PROVENANCE_TYPES = [
  "source_material",
  "synthesized_context",
  "operating_rule",
  "strategic_doctrine",
  "meta_system_design"
] as const;
const ALLOWED_DESTINATIONS = [
  "entities",
  "proposed_updates",
  "source_links",
  "extraction_sessions"
] as const;

export type ContextAnalysisSuggestion = {
  destination_table: (typeof ALLOWED_DESTINATIONS)[number];
  kind_key: (typeof ALLOWED_KIND_KEYS)[number];
  semantic_role: (typeof ALLOWED_SEMANTIC_ROLES)[number];
  provenance_type: (typeof ALLOWED_PROVENANCE_TYPES)[number];
  entity_type: string;
  title: string;
  summary: string;
  priority?: string;
  status?: string;
  confidence: number;
  rationale: string;
  source_link?: {
    source_type: string;
    source_uri?: string;
    source_title?: string;
  };
};

export type ContextAnalysisResult = {
  ok: true;
  provider: "deepseek" | "heuristic";
  suggestion: ContextAnalysisSuggestion;
};

export function heuristicAnalyzeContextInput(input: {
  rawInput: string;
  requestText?: string;
  repo?: string;
  cwd?: string;
}) {
  const raw = input.rawInput.trim();
  const lowered = raw.toLowerCase();
  const firstSentence = raw.split(/[\n.!?]/).find((line) => line.trim())?.trim() ?? "Context item";
  const title = firstSentence.slice(0, 100);

  let kindKey: ContextAnalysisSuggestion["kind_key"] = "summary";
  let semanticRole: ContextAnalysisSuggestion["semantic_role"] = "summary";
  let entityType = "summary";
  let provenanceType: ContextAnalysisSuggestion["provenance_type"] = "synthesized_context";
  let destinationTable: ContextAnalysisSuggestion["destination_table"] = "entities";
  let priority: string | undefined;
  let status: string | undefined;
  let rationale = "Fallback heuristic classification based on input wording.";

  if (/(decid|chosen|we will|we should|decision)/i.test(raw)) {
    kindKey = "decision";
    semanticRole = "decision";
    entityType = "decision";
    rationale = "Detected decision-like language in the input.";
  } else if (/(lesson|learned|learning|takeaway|observation)/i.test(raw)) {
    kindKey = "lesson";
    semanticRole = "lesson";
    entityType = "learning";
    rationale = "Detected learning or reflection language in the input.";
  } else if (/(todo|next|implement|build|fix|task|work item|priority)/i.test(raw)) {
    kindKey = "work_item";
    semanticRole = "work_item";
    entityType = "task";
    status = /(done|completed)/i.test(raw) ? "done" : "active";
    rationale = "Detected task-oriented language in the input.";
  } else if (/(http|https|github\.com|railway|docs|reference|link)/i.test(raw)) {
    kindKey = "reference";
    semanticRole = "reference";
    entityType = "reference";
    provenanceType = "source_material";
    rationale = "Detected reference or link-like language in the input.";
  }

  if (/(source material|transcript|notes from|imported|copied from|reference doc)/i.test(raw)) {
    provenanceType = "source_material";
  } else if (/(rule|policy|principle|operating rule)/i.test(raw)) {
    provenanceType = "operating_rule";
  } else if (/(doctrine|strategy|strategic)/i.test(raw)) {
    provenanceType = "strategic_doctrine";
  } else if (/(meta system|system design|operating model|how ruksak should behave)/i.test(raw)) {
    provenanceType = "meta_system_design";
  }

  if (/(urgent|p0)/i.test(lowered)) {
    priority = "urgent";
  } else if (/(high priority|p1|critical)/i.test(lowered)) {
    priority = "high";
  } else if (/(low priority|p3)/i.test(lowered)) {
    priority = "low";
  }

  if (/https?:\/\//i.test(raw) && kindKey === "reference") {
    destinationTable = "source_links";
  }

  return {
    ok: true as const,
    provider: "heuristic" as const,
    suggestion: {
      destination_table: destinationTable,
      kind_key: kindKey,
      semantic_role: semanticRole,
      provenance_type: provenanceType,
      entity_type: entityType,
      title,
      summary: raw,
      priority,
      status,
      confidence: 0.46,
      rationale
    }
  };
}

function sanitizeEnumValue<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]) {
  return typeof value === "string" && allowed.includes(value as T[number])
    ? (value as T[number])
    : fallback;
}

function sanitizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sanitizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function clampConfidence(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}

export async function analyzeContextInput(input: {
  rawInput: string;
  requestText?: string;
  projectSlug?: string;
  repo?: string;
  cwd?: string;
}) {
  const heuristic = heuristicAnalyzeContextInput(input);

  if (!isDeepSeekConfigured()) {
    return heuristic;
  }

  try {
    const response = await callDeepSeekJson({
      system: [
        "You classify raw user input into the existing Ruksak storage model.",
        "Return only valid JSON.",
        "Pick one destination_table from: entities, proposed_updates, source_links, extraction_sessions.",
        "Pick one kind_key from: summary, work_item, lesson, decision, reference.",
        "Pick one semantic_role from: summary, work_item, lesson, decision, reference.",
        "Pick one provenance_type from: source_material, synthesized_context, operating_rule, strategic_doctrine, meta_system_design.",
        "Choose an entity_type consistent with the kind.",
        "Produce a short actionable title and concise durable summary.",
        "Use proposed_updates only when the input suggests review or uncertainty.",
        "Use source_links when the input is mainly an external link or source reference.",
        "Use extraction_sessions when the input is raw imported material that should be parsed later.",
        "Prefer entities for straightforward durable context."
      ].join(" "),
      user: JSON.stringify({
        raw_input: input.rawInput,
        request_text: input.requestText ?? null,
        project_slug: input.projectSlug ?? null,
        repo: input.repo ?? null,
        cwd: input.cwd ?? null,
        fallback: heuristic.suggestion
      })
    });

    return {
      ok: true as const,
      provider: "deepseek" as const,
      suggestion: {
        destination_table: sanitizeEnumValue(
          response.destination_table,
          ALLOWED_DESTINATIONS,
          heuristic.suggestion.destination_table
        ),
        kind_key: sanitizeEnumValue(response.kind_key, ALLOWED_KIND_KEYS, heuristic.suggestion.kind_key),
        semantic_role: sanitizeEnumValue(
          response.semantic_role,
          ALLOWED_SEMANTIC_ROLES,
          heuristic.suggestion.semantic_role
        ),
        provenance_type: sanitizeEnumValue(
          response.provenance_type,
          ALLOWED_PROVENANCE_TYPES,
          heuristic.suggestion.provenance_type
        ),
        entity_type: sanitizeString(response.entity_type, heuristic.suggestion.entity_type),
        title: sanitizeString(response.title, heuristic.suggestion.title),
        summary: sanitizeString(response.summary, heuristic.suggestion.summary),
        priority: sanitizeOptionalString(response.priority) ?? heuristic.suggestion.priority,
        status: sanitizeOptionalString(response.status) ?? heuristic.suggestion.status,
        confidence: clampConfidence(response.confidence, 0.72),
        rationale: sanitizeString(response.rationale, "DeepSeek classification with heuristic fallback."),
        source_link:
          response.source_link && typeof response.source_link === "object"
            ? {
                source_type: sanitizeString(
                  (response.source_link as Record<string, unknown>).source_type,
                  "external"
                ),
                source_uri: sanitizeOptionalString(
                  (response.source_link as Record<string, unknown>).source_uri
                ),
                source_title: sanitizeOptionalString(
                  (response.source_link as Record<string, unknown>).source_title
                )
              }
            : undefined
      }
    };
  } catch {
    return heuristic;
  }
}
