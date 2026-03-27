import "server-only";

type RiskLevel = "low" | "medium" | "high";

export type UpdateRiskInput = {
  action: "create" | "update";
  kindKey: "summary" | "work_item" | "lesson" | "decision" | "reference";
  existingKindKey?: string | null;
  existingStatus?: string | null;
  nextStatus?: string | null;
  existingPriority?: string | null;
  nextPriority?: string | null;
  existingSummary?: string | null;
  nextSummary?: string | null;
  projectCreated?: boolean;
  accountContextChanged?: boolean;
};

export type UpdateRiskDecision = {
  riskLevel: RiskLevel;
  autoCaptured: boolean;
  reviewRecommended: boolean;
  requiresExplicitApproval: boolean;
  reasons: string[];
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function materiallyChangedText(left?: string | null, right?: string | null) {
  const a = normalize(left);
  const b = normalize(right);

  if (!a && !b) {
    return false;
  }

  return a !== b;
}

export function classifyContextUpdateRisk(input: UpdateRiskInput): UpdateRiskDecision {
  const reasons: string[] = [];
  let riskLevel: RiskLevel = "low";

  const existingStatus = normalize(input.existingStatus);
  const nextStatus = normalize(input.nextStatus);
  const existingPriority = normalize(input.existingPriority);
  const nextPriority = normalize(input.nextPriority);
  const kindChanged =
    Boolean(input.existingKindKey) && normalize(input.existingKindKey) !== normalize(input.kindKey);
  const summaryChanged = materiallyChangedText(input.existingSummary, input.nextSummary);

  if (input.projectCreated) {
    riskLevel = "high";
    reasons.push("Creates a new project record.");
  }

  if (input.accountContextChanged) {
    riskLevel = "high";
    reasons.push("Changes account-context provenance.");
  }

  if (kindChanged) {
    riskLevel = riskLevel === "high" ? "high" : "medium";
    reasons.push("Reclassifies an existing context item.");
  }

  if (input.action === "create") {
    if (input.kindKey === "summary") {
      riskLevel = riskLevel === "high" ? "high" : "medium";
      reasons.push("Creates a summary-level record.");
    } else {
      reasons.push("Adds a new context item.");
    }
  }

  if (input.action === "update") {
    if (input.kindKey === "work_item" && existingStatus !== nextStatus && nextStatus) {
      reasons.push("Updates task status.");
    }

    if (existingPriority !== nextPriority && nextPriority) {
      riskLevel = riskLevel === "high" ? "high" : "medium";
      reasons.push("Changes priority.");
    }

    if (summaryChanged) {
      if (input.kindKey === "summary") {
        riskLevel = "high";
        reasons.push("Materially changes core summary context.");
      } else if (input.kindKey === "decision") {
        riskLevel = riskLevel === "high" ? "high" : "medium";
        reasons.push("Edits an existing decision.");
      } else {
        riskLevel = riskLevel === "high" ? "high" : "medium";
        reasons.push("Materially changes an existing context item.");
      }
    }
  }

  if (!reasons.length) {
    reasons.push("Routine additive context capture.");
  }

  return {
    riskLevel,
    autoCaptured: true,
    reviewRecommended: riskLevel !== "low",
    requiresExplicitApproval: riskLevel === "high",
    reasons
  };
}
