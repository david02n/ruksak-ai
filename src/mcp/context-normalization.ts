import "server-only";

import type { InferSelectModel } from "drizzle-orm";

import { changeEvents, entities, projects } from "@/db/schema";

type EntityRow = InferSelectModel<typeof entities>;
type ProjectRow = InferSelectModel<typeof projects>;
type ChangeEventRow = InferSelectModel<typeof changeEvents>;

type StructureKindConfig = {
  key: string;
  label: string;
  semantic_role: string;
  entity_types?: string[];
};

export type ContextStructureProfile = {
  id: string;
  name: string;
  slug: string;
  version: string;
  config: {
    kinds: StructureKindConfig[];
  };
};

export type NormalizedContextItem = {
  id: string;
  title: string;
  summary: string | null;
  semantic_role: string;
  kind_key: string;
  entity_type: string;
  provenance_type: string;
  updated_at: string;
  project_id: string | null;
  project_slug: string | null;
  project_type: string | null;
  parent_project_id: string | null;
  source_project_id: string | null;
  source_project_slug: string | null;
  source_ref: Record<string, unknown> | null;
  data: Record<string, unknown>;
};

export type NormalizedContext = {
  summary: NormalizedContextItem[];
  work_items: NormalizedContextItem[];
  lessons: NormalizedContextItem[];
  decisions: NormalizedContextItem[];
  references: NormalizedContextItem[];
  recent_updates: Array<{
    id: string;
    title: string;
    summary: string;
    created_at: string;
  }>;
};

function asIsoString(value: Date | null) {
  return value ? value.toISOString() : "";
}

function defaultKindForEntityType(entityType: string) {
  switch (entityType) {
    case "project":
    case "plan":
    case "initiative":
    case "task":
      return "work_item";
    case "learning":
    case "lesson":
    case "reflection":
      return "lesson";
    case "decision":
      return "decision";
    case "resource":
    case "reference":
    case "tool":
      return "reference";
    case "summary":
    case "note":
    default:
      return "summary";
  }
}

function roleBucket(role: string): keyof Omit<NormalizedContext, "recent_updates"> {
  switch (role) {
    case "work_item":
      return "work_items";
    case "lesson":
      return "lessons";
    case "decision":
      return "decisions";
    case "reference":
      return "references";
    case "summary":
    default:
      return "summary";
  }
}

export function normalizeContext(input: {
  structure: ContextStructureProfile;
  entities: EntityRow[];
  projects: ProjectRow[];
  changes: ChangeEventRow[];
}) {
  const projectMap = new Map(input.projects.map((project) => [project.id, project]));
  const kindMap = new Map(
    input.structure.config.kinds.map((kind) => [kind.key, kind.semantic_role])
  );

  const normalized: NormalizedContext = {
    summary: [],
    work_items: [],
    lessons: [],
    decisions: [],
    references: [],
    recent_updates: input.changes.map((change) => ({
      id: change.id,
      title: `${change.actionType} event`,
      summary: `${change.actorLabel ?? "unknown actor"} via ${change.originSurface ?? "unknown surface"}`,
      created_at: asIsoString(change.createdAt)
    }))
  };

  input.entities.forEach((entity) => {
    const kindKey = entity.kindKey ?? defaultKindForEntityType(entity.entityType);
    const semanticRole = entity.semanticRole ?? kindMap.get(kindKey) ?? "summary";

    if (!kindMap.has(kindKey)) {
      return;
    }

    const bucket = roleBucket(semanticRole);
    const project = entity.projectId ? projectMap.get(entity.projectId) : null;
    const sourceProject = entity.sourceProjectId ? projectMap.get(entity.sourceProjectId) : null;

    normalized[bucket].push({
      id: entity.id,
      title: entity.title,
      summary: entity.summary,
      semantic_role: semanticRole,
      kind_key: kindKey,
      entity_type: entity.entityType,
      provenance_type: entity.provenanceType,
      updated_at: asIsoString(entity.updatedAt),
      project_id: entity.projectId ?? null,
      project_slug: project?.slug ?? null,
      project_type: project?.projectType ?? null,
      parent_project_id: project?.parentProjectId ?? null,
      source_project_id: entity.sourceProjectId ?? null,
      source_project_slug: sourceProject?.slug ?? null,
      source_ref: entity.sourceEntityRef ?? null,
      data: {
        ...entity.data,
        status: entity.status,
        priority: entity.priority ?? entity.data.priority ?? null,
        started_at: asIsoString(entity.startedAt),
        completed_at: asIsoString(entity.completedAt)
      }
    });
  });

  return normalized;
}
