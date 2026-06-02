export type ContextMode =
  | "user"
  | "portfolio"
  | "project"
  | "multi_project"
  | "new_project_candidate";

export type ProjectLike = {
  id: string;
  name: string;
  slug: string;
  projectType?: string | null;
  parentProjectId?: string | null;
  repoOwner?: string | null;
  repoName?: string | null;
  rootPath?: string | null;
  description?: string | null;
};

export type CandidateProject = {
  id: string;
  name: string;
  slug: string;
  project_type: string | null;
  parent_project_id: string | null;
  repo?: string | null;
  root_path?: string | null;
  score: number;
  signals: string[];
};

export type ContextResolution = {
  mode: ContextMode;
  focusProjectId: string | null;
  focusCandidates: CandidateProject[];
  activePortfolio: CandidateProject[];
  confidence: number;
  confidenceLabel: "low" | "medium" | "high";
  resolutionSource: string;
  resolutionExplanation: string[];
  resolutionSignalBreakdown: {
    explicit: string[];
    environment: string[];
    semantic: string[];
    affinity: string[];
  };
  clarificationRequired: boolean;
  newProjectRecommended: boolean;
  sessionFocusApplied: boolean;
  explicitOverrideApplied: boolean;
};

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function confidenceLabel(value: number) {
  if (value >= 0.9) {
    return "high" as const;
  }

  if (value >= 0.7) {
    return "medium" as const;
  }

  return "low" as const;
}

export function projectRepo(project: ProjectLike) {
  if (!project.repoOwner || !project.repoName) {
    return null;
  }

  return `${project.repoOwner}/${project.repoName}`.toLowerCase();
}

function buildCandidateProject(candidate: {
  project: ProjectLike;
  score: number;
  signals: string[];
}): CandidateProject {
  return {
    id: candidate.project.id,
    name: candidate.project.name,
    slug: candidate.project.slug,
    project_type: candidate.project.projectType ?? "build",
    parent_project_id: candidate.project.parentProjectId ?? null,
    repo: projectRepo(candidate.project),
    root_path: candidate.project.rootPath ?? null,
    score: candidate.score,
    signals: candidate.signals
  };
}

function signalCategory(signal: string) {
  if (signal.startsWith("explicit_")) {
    return "explicit" as const;
  }

  if (
    [
      "repo_mapping",
      "repo_hint_partial",
      "cwd_root_path",
      "cwd_slug_match",
      "explicit_project_type"
    ].includes(signal)
  ) {
    return "environment" as const;
  }

  if (["session_affinity", "current_project_affinity"].includes(signal)) {
    return "affinity" as const;
  }

  return "semantic" as const;
}

function buildSignalBreakdown(signals: string[]) {
  return signals.reduce(
    (acc, signal) => {
      acc[signalCategory(signal)].push(signal);
      return acc;
    },
    {
      explicit: [] as string[],
      environment: [] as string[],
      semantic: [] as string[],
      affinity: [] as string[]
    }
  );
}

function summarizeSignals(signals: string[]) {
  const labels: Record<string, string> = {
    explicit_project_id: "explicit project id matched",
    explicit_project_slug: "explicit project slug matched",
    explicit_project_type: "explicit project type matched",
    repo_mapping: "repository matched an existing project",
    repo_hint_partial: "repository hint partially matched",
    cwd_root_path: "working directory matched the project root",
    cwd_slug_match: "working directory matched the project name",
    request_text_exact_project: "request text named the project",
    request_text_repo_match: "request text matched the repository",
    request_text_token_overlap: "request text overlapped the project language",
    request_text_description_overlap: "request text overlapped the project description",
    request_text_project_type_match: "request text implied the project type",
    request_text_new_context: "request text suggests distinct new work",
    request_text_plurality: "request text implies multiple active projects",
    request_text_portfolio: "request text implies portfolio-level context",
    session_affinity: "recent session history points here",
    current_project_affinity: "stored current project points here"
  };

  return signals.slice(0, 4).map((signal) => labels[signal] ?? signal.replaceAll("_", " "));
}

function buildActivePortfolio(input: {
  userProjects: ProjectLike[];
  rankedCandidates: Array<{ project: ProjectLike; score: number; signals: string[] }>;
}) {
  const rankedById = new Map(
    input.rankedCandidates.map((candidate) => [candidate.project.id, candidate])
  );

  const portfolio = input.userProjects
    .map((project) => {
      const ranked = rankedById.get(project.id);

      return buildCandidateProject({
        project,
        score: ranked?.score ?? 0,
        signals: ranked?.signals ?? []
      });
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 8);

  return portfolio;
}

function resolutionSourceFromSignals(signals: string[]) {
  const mostlyAffinity =
    signals.length > 0 && signals.every((signal) => signalCategory(signal) === "affinity");

  if (mostlyAffinity) {
    return "affinity_inference";
  }

  return signals[0] ?? "user_level_context";
}

export function finalizeProjectResolution(input: {
  userProjects: ProjectLike[];
  rankedCandidates: Array<{ project: ProjectLike; score: number; signals: string[] }>;
  pluralityLikely?: boolean;
  portfolioLikely?: boolean;
  newProjectLikely?: boolean;
}): ContextResolution {
  const top = input.rankedCandidates[0];
  const next = input.rankedCandidates[1];
  const focusCandidates = input.rankedCandidates.slice(0, 5).map(buildCandidateProject);
  const activePortfolio = buildActivePortfolio(input);

  if (!top) {
    const mode = input.newProjectLikely ? "new_project_candidate" : "user";
    const explanation = input.newProjectLikely
      ? ["No existing project matched strongly and the request looks like distinct new work."]
      : ["No project signals were strong enough to resolve a focus project."];

    return {
      mode,
      focusProjectId: null,
      focusCandidates: [],
      activePortfolio,
      confidence: input.newProjectLikely ? 0.38 : 0.2,
      confidenceLabel: confidenceLabel(input.newProjectLikely ? 0.38 : 0.2),
      resolutionSource: mode === "new_project_candidate" ? "new_project_candidate" : "user_level_context",
      resolutionExplanation: explanation,
      resolutionSignalBreakdown: {
        explicit: [],
        environment: [],
        semantic: [],
        affinity: []
      },
      clarificationRequired: false,
      newProjectRecommended: input.newProjectLikely ?? false,
      sessionFocusApplied: false,
      explicitOverrideApplied: false
    };
  }

  const hasExplicitSignal = top.signals.some((signal) =>
    ["explicit_project_id", "explicit_project_slug"].includes(signal)
  );
  const hasStrongEnvironmentSignal = top.signals.some((signal) =>
    ["repo_mapping", "cwd_root_path", "request_text_exact_project", "request_text_repo_match"].includes(signal)
  );
  const mostlyAffinity =
    top.signals.length > 0 && top.signals.every((signal) => signalCategory(signal) === "affinity");
  const topDominant = !next || top.score - next.score >= 18;
  const topStrong = top.score >= 58 || hasExplicitSignal || hasStrongEnvironmentSignal;

  let mode: ContextMode;

  if (input.newProjectLikely && top.score < 40) {
    mode = "new_project_candidate";
  } else if (input.pluralityLikely && focusCandidates.length > 1) {
    mode = "multi_project";
  } else if (!topDominant && focusCandidates.length > 1) {
    mode = "multi_project";
  } else if (topStrong && topDominant && !input.pluralityLikely && !mostlyAffinity) {
    mode = "project";
  } else if (input.portfolioLikely || mostlyAffinity || top.score < 58) {
    mode = "portfolio";
  } else {
    mode = "project";
  }

  const confidenceBase =
    top.score >= 100
      ? 0.99
      : top.score >= 75
        ? 0.9
        : top.score >= 55
          ? 0.8
          : top.score >= 40
            ? 0.68
            : 0.5;
  const confidenceDeltaBoost = next
    ? Math.min(0.08, Math.max(0, (top.score - next.score) / 100))
    : 0.06;
  const confidence = clampConfidence(confidenceBase + confidenceDeltaBoost);

  return {
    mode,
    focusProjectId: mode === "project" ? top.project.id : null,
    focusCandidates,
    activePortfolio,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    resolutionSource: resolutionSourceFromSignals(top.signals),
    resolutionExplanation: summarizeSignals(top.signals),
    resolutionSignalBreakdown: buildSignalBreakdown(top.signals),
    clarificationRequired: false,
    newProjectRecommended: mode === "new_project_candidate",
    sessionFocusApplied: false,
    explicitOverrideApplied: hasExplicitSignal
  };
}
