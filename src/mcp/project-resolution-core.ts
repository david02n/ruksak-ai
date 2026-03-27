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

export type ProjectResolution = {
  projectId: string | null;
  confidence: number;
  resolutionSource: string;
  resolutionExplanation: string[];
  resolutionSignalBreakdown: {
    explicit: string[];
    environment: string[];
    semantic: string[];
    affinity: string[];
  };
  recommendedActions: string[];
  candidateProjects: CandidateProject[];
  clarificationRequired: boolean;
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
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
    request_text_new_context: "request text suggests a separate context",
    session_affinity: "recent session history points here",
    current_project_affinity: "current Ruksak project points here"
  };

  return signals.slice(0, 4).map((signal) => labels[signal] ?? signal.replaceAll("_", " "));
}

function buildRecommendedActions(input: {
  topProject?: ProjectLike;
  clarificationRequired: boolean;
  candidateProjects: CandidateProject[];
  topSignals: string[];
}) {
  const actions: string[] = [];
  const topType = input.topProject?.projectType ?? "build";
  const looksLikeSeparateContext = input.topSignals.includes("request_text_new_context");

  if (input.clarificationRequired) {
    if (looksLikeSeparateContext) {
      actions.push("create_new_foundation_or_workstream");
      actions.push("stay_in_user_level_context");
    } else if (input.candidateProjects.length) {
      actions.push("choose_existing_project");
    } else {
      actions.push("create_new_project");
    }
  } else if (input.topProject) {
    actions.push("open_existing_project");
    if (topType === "foundation" || topType === "workstream" || topType === "operating_model") {
      actions.push("confirm_non_build_context");
    }
  } else {
    actions.push("stay_in_user_level_context");
  }

  return actions;
}

function shouldClarify(input: {
  topScore: number;
  nextScore?: number;
  userProjectsCount: number;
  topSignals: string[];
}) {
  const hasExplicitSignal = input.topSignals.some((signal) =>
    ["explicit_project_id", "explicit_project_slug"].includes(signal)
  );
  if (hasExplicitSignal) {
    return false;
  }

  const hasStrongInferenceSignal = input.topSignals.some((signal) =>
    [
      "repo_mapping",
      "cwd_root_path",
      "request_text_exact_project",
      "request_text_repo_match",
      "explicit_project_type",
      "request_text_project_type_match"
    ].includes(signal)
  );
  const mostlyAffinity =
    input.topSignals.length > 0 &&
    input.topSignals.every((signal) => signalCategory(signal) === "affinity");

  if (input.topSignals.includes("request_text_new_context")) {
    return true;
  }

  if (mostlyAffinity) {
    return true;
  }

  if (input.nextScore !== undefined && input.topScore - input.nextScore < 15) {
    return true;
  }

  if (input.userProjectsCount === 1) {
    return !(
      hasStrongInferenceSignal ||
      input.topSignals.includes("session_affinity") ||
      input.topSignals.includes("current_project_affinity")
    );
  }

  if (hasStrongInferenceSignal && input.topScore >= 48) {
    return false;
  }

  if (
    (input.topSignals.includes("session_affinity") ||
      input.topSignals.includes("current_project_affinity")) &&
    input.topScore >= 42
  ) {
    return false;
  }

  return input.topScore < 70;
}

export function finalizeProjectResolution(input: {
  userProjects: ProjectLike[];
  rankedCandidates: Array<{ project: ProjectLike; score: number; signals: string[] }>;
}): ProjectResolution {
  const candidateProjects = input.rankedCandidates.slice(0, 5).map(buildCandidateProject);
  const top = input.rankedCandidates[0];
  const next = input.rankedCandidates[1];

  if (!top) {
    return {
      projectId: null,
      confidence: 0.2,
      resolutionSource: "user_level_context",
      resolutionExplanation: ["No project signals were strong enough to resolve a project."],
      resolutionSignalBreakdown: {
        explicit: [],
        environment: [],
        semantic: [],
        affinity: []
      },
      recommendedActions: ["stay_in_user_level_context", "create_new_project"],
      candidateProjects: input.userProjects.slice(0, 5).map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
        project_type: project.projectType ?? "build",
        parent_project_id: project.parentProjectId ?? null,
        repo: projectRepo(project),
        root_path: project.rootPath ?? null,
        score: 0,
        signals: []
      })),
      clarificationRequired: false
    } satisfies ProjectResolution;
  }

  const confidenceBase =
    top.score >= 100
      ? 0.99
      : top.score >= 75
        ? 0.9
        : top.score >= 55
          ? 0.8
          : top.score >= 40
            ? 0.72
            : 0.45;
  const confidenceDeltaBoost = next
    ? Math.min(0.08, Math.max(0, (top.score - next.score) / 100))
    : 0.06;
  const confidence = clampConfidence(confidenceBase + confidenceDeltaBoost);
  const clarificationRequired = shouldClarify({
    topScore: top.score,
    nextScore: next?.score,
    userProjectsCount: input.userProjects.length,
    topSignals: top.signals
  });
  const signalBreakdown = buildSignalBreakdown(top.signals);
  const mostlyAffinity =
    top.signals.length > 0 && top.signals.every((signal) => signalCategory(signal) === "affinity");
  const resolutionSource = mostlyAffinity
    ? "affinity_inference"
    : top.signals[0] ?? "inference";

  return {
    projectId: clarificationRequired ? null : top.project.id,
    confidence,
    resolutionSource,
    resolutionExplanation: summarizeSignals(top.signals),
    resolutionSignalBreakdown: signalBreakdown,
    recommendedActions: buildRecommendedActions({
      topProject: clarificationRequired ? undefined : top.project,
      clarificationRequired,
      candidateProjects,
      topSignals: top.signals
    }),
    candidateProjects,
    clarificationRequired
  } satisfies ProjectResolution;
}
