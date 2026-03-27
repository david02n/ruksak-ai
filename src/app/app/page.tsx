import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

import { AppShell } from "@/components/app-shell";
import { PostHogPageEvent } from "@/components/posthog-page-event";
import { getCurrentContextView, getUserByPrimaryEmail } from "@/lib/current-context";

export const dynamic = "force-dynamic";

const PROJECT_TYPE_FILTERS = ["all", "build", "workstream", "foundation", "operating_model"] as const;
const PROVENANCE_FILTERS = [
  "all",
  "source_material",
  "synthesized_context",
  "operating_rule",
  "strategic_doctrine",
  "meta_system_design"
] as const;

type AppPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readFilter(
  value: string | string[] | undefined,
  allowed: readonly string[],
  fallback: string
) {
  const resolved = typeof value === "string" ? value : undefined;
  return resolved && allowed.includes(resolved) ? resolved : fallback;
}

function filterItems<T extends { project_type?: string | null; provenance_type?: string | null }>(
  items: T[],
  projectType: string,
  provenanceType: string
) {
  return items.filter((item) => {
    const matchesProject = projectType === "all" || (item.project_type ?? "unscoped") === projectType;
    const matchesProvenance =
      provenanceType === "all" || (item.provenance_type ?? "synthesized_context") === provenanceType;
    return matchesProject && matchesProvenance;
  });
}

function FilterLinks(input: {
  title: string;
  queryKey: "projectType" | "provenanceType";
  current: string;
  options: readonly string[];
  otherKey: "projectType" | "provenanceType";
  otherValue: string;
}) {
  return (
    <div className="filter-block">
      <span className="card-tag">{input.title}</span>
      <div className="app-nav filter-nav">
        {input.options.map((option) => {
          const href = `/app?${new URLSearchParams({
            [input.queryKey]: option,
            [input.otherKey]: input.otherValue
          }).toString()}`;

          return (
            <Link
              key={option}
              className={option === input.current ? "filter-link filter-link-active" : "filter-link"}
              href={href}
            >
              {option}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DetailList(input: {
  title: string;
  items: Array<{
    id?: string;
    title?: string;
    summary?: string | null;
    priority?: string | null;
    status?: string | null;
    updated_at?: string;
    project_type?: string | null;
    provenance_type?: string | null;
    source_project_slug?: string | null;
  }>;
  empty: string;
}) {
  return (
    <article className="card">
      <span className="card-tag">{input.title}</span>
      {input.items.length ? (
        <div className="context-list">
          {input.items.map((item, index) => (
            <div className="context-item" key={item.id ?? `${input.title}-${index}`}>
              <div className="context-item-top">
                <h3>{item.title ?? "Untitled item"}</h3>
                <div className="context-item-meta">
                  {item.priority ? <span>{item.priority}</span> : null}
                  {item.status ? <span>{item.status}</span> : null}
                  {item.project_type ? <span>{item.project_type}</span> : null}
                  {item.provenance_type ? <span>{item.provenance_type}</span> : null}
                  {item.source_project_slug ? <span>source:{item.source_project_slug}</span> : null}
                </div>
              </div>
              {item.summary ? <p>{item.summary}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p>{input.empty}</p>
      )}
    </article>
  );
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const clerkUser = await currentUser();
  const params = (await searchParams) ?? {};
  const projectTypeFilter = readFilter(params.projectType, PROJECT_TYPE_FILTERS, "all");
  const provenanceTypeFilter = readFilter(params.provenanceType, PROVENANCE_FILTERS, "all");

  if (!clerkUser?.primaryEmailAddress?.emailAddress) {
    return (
      <AppShell
        eyebrow="Private app"
        title="You need to sign in first"
        copy="The landing page is public, but the product workspace lives behind authentication."
      >
        <div className="cta-row">
          <Link className="button" href="/login">
            Go to login
          </Link>
        </div>
      </AppShell>
    );
  }

  const email = clerkUser.primaryEmailAddress.emailAddress;
  const user = await getUserByPrimaryEmail(email);

  if (!user) {
    return (
      <AppShell
        eyebrow="Private app"
        title="We couldn't find your Ruksak user yet"
        copy="Sign in again or create context through the MCP flow first so the control surface has a user record to load."
      />
    );
  }

  const view = await getCurrentContextView({
    userId: user.id,
    email,
    name: clerkUser.fullName
  });

  const resolvedProject = view.envelope.metadata.resolved_project;
  const context = view.envelope.context;
  const pageTitle = resolvedProject?.name ?? "Current context";
  const groupingSummary =
    "grouping_summary" in context
      ? context.grouping_summary
      : { by_project_type: {}, by_provenance_type: {} };
  const guidanceInstructions =
    "guidance" in view.envelope ? view.envelope.guidance.instructions.join(" ") : "";
  const filteredPriorities = filterItems(context.current_priorities, projectTypeFilter, provenanceTypeFilter);
  const filteredActiveWork = filterItems(context.active_work_items, projectTypeFilter, provenanceTypeFilter);
  const filteredDecisions = filterItems(context.decisions, projectTypeFilter, provenanceTypeFilter);
  const filteredLessons = filterItems(context.recent_lessons, projectTypeFilter, provenanceTypeFilter);
  const filteredReferences = filterItems(context.references, projectTypeFilter, provenanceTypeFilter);
  const foundationsAndWorkstreams = view.projects.filter((project) =>
    ["foundation", "workstream", "operating_model"].includes(project.projectType)
  );
  const buildProjects = view.projects.filter((project) => project.projectType === "build");

  return (
    <AppShell
      eyebrow="Ruksak control surface"
      title={pageTitle}
      copy={`Signed in as ${email}. This view uses the same normalized current-work model as open_ruksak.`}
    >
      <PostHogPageEvent
        event="workspace_viewed"
        properties={{
          resolved_project_slug: resolvedProject?.slug ?? null,
          resolved_project_type: resolvedProject?.project_type ?? null,
          clarification_required: view.envelope.metadata.clarification_required
        }}
      />
      <div className="card-grid single-card-grid">
        <article className="card">
          <span className="card-tag">Current state</span>
          <h3>What Ruksak would reopen right now</h3>
          <p>{context.current_context_summary.join(" ")}</p>
          <div className="context-list">
            <div className="context-item">
              <div className="context-item-top">
                <h3>Resolution</h3>
                <div className="context-item-meta">
                  {resolvedProject?.project_type ? <span>{resolvedProject.project_type}</span> : null}
                  <span>{view.envelope.metadata.confidence}</span>
                </div>
              </div>
              <p>{view.envelope.metadata.resolution_explanation.join(". ")}</p>
              <div className="context-item-meta">
                {view.envelope.metadata.recommended_actions.map((action) => (
                  <span key={action}>{action}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="metric-grid context-metrics">
            <div className="metric">
              <strong>{context.active_work_items.length}</strong>
              <span>Active work items</span>
            </div>
            <div className="metric">
              <strong>{context.recent_updates.length}</strong>
              <span>Recent updates</span>
            </div>
            <div className="metric">
              <strong>{view.projects.length}</strong>
              <span>Projects</span>
            </div>
            <div className="metric">
              <strong>{view.accountContexts.length}</strong>
              <span>Account contexts</span>
            </div>
          </div>
        </article>

        <article className="card">
          <span className="card-tag">Inspect</span>
          <h3>Review what Ruksak believes</h3>
          <div className="app-nav">
            <Link href={view.envelope.inspect.paths.workspace}>Workspace</Link>
            <Link href={view.envelope.inspect.paths.projects}>Projects</Link>
            {view.envelope.inspect.paths.current_project ? (
              <Link href={view.envelope.inspect.paths.current_project}>Current project</Link>
            ) : null}
          </div>
          <p>{view.envelope.inspect.workspace_url}</p>
          <div className="context-item-meta">
            {Object.entries(groupingSummary.by_project_type).map(([key, count]) => (
              <span key={key}>
                {key}:{String(count)}
              </span>
            ))}
            {Object.entries(groupingSummary.by_provenance_type).map(([key, count]) => (
              <span key={key}>
                {key}:{String(count)}
              </span>
            ))}
          </div>
        </article>

        <article className="card">
          <span className="card-tag">Filters</span>
          <h3>Slice the current context</h3>
          <FilterLinks
            title="Project type"
            queryKey="projectType"
            current={projectTypeFilter}
            options={PROJECT_TYPE_FILTERS}
            otherKey="provenanceType"
            otherValue={provenanceTypeFilter}
          />
          <FilterLinks
            title="Provenance"
            queryKey="provenanceType"
            current={provenanceTypeFilter}
            options={PROVENANCE_FILTERS}
            otherKey="projectType"
            otherValue={projectTypeFilter}
          />
        </article>

        {view.envelope.metadata.clarification_required ? (
          <article className="card">
            <span className="card-tag">Clarification</span>
            <h3>This context still needs confirmation</h3>
            <p>{guidanceInstructions}</p>
            <div className="context-list">
              {view.envelope.metadata.candidate_projects.map((project) => (
                <div className="context-item" key={project.id}>
                  <div className="context-item-top">
                    <h3>{project.name}</h3>
                    <div className="context-item-meta">
                      <span>{project.project_type}</span>
                      <span>{project.score}</span>
                    </div>
                  </div>
                  <p>{project.signals.join(", ")}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        <DetailList
          title="Current priorities"
          items={filteredPriorities}
          empty="No current priorities are stored yet."
        />

        <DetailList
          title="Active work"
          items={filteredActiveWork}
          empty="No active work items are stored yet."
        />

        <DetailList
          title="Recent decisions"
          items={filteredDecisions}
          empty="No recent decisions are stored yet."
        />

        <DetailList
          title="Recent lessons"
          items={filteredLessons}
          empty="No recent lessons are stored yet."
        />

        <DetailList
          title="References"
          items={filteredReferences}
          empty="No references match the current filters."
        />

        <article className="card" id="projects">
          <span className="card-tag">Projects</span>
          <h3>Build projects</h3>
          {buildProjects.length ? (
            <div className="context-list">
              {buildProjects.map((project) => (
                <div className="context-item" key={project.id}>
                  <div className="context-item-top">
                    <h3>{project.name}</h3>
                    <div className="context-item-meta">
                      <span>{project.slug}</span>
                      <span>{project.projectType}</span>
                    </div>
                  </div>
                  <p>{project.description ?? "No description yet."}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No build projects yet.</p>
          )}
        </article>

        <article className="card">
          <span className="card-tag">Foundations</span>
          <h3>Foundations, workstreams, and operating models</h3>
          {foundationsAndWorkstreams.length ? (
            <div className="context-list">
              {foundationsAndWorkstreams.map((project) => (
                <div className="context-item" key={project.id}>
                  <div className="context-item-top">
                    <h3>{project.name}</h3>
                    <div className="context-item-meta">
                      <span>{project.slug}</span>
                      <span>{project.projectType}</span>
                    </div>
                  </div>
                  <p>{project.description ?? "No description yet."}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No foundations or workstreams yet.</p>
          )}
        </article>

        <article className="card">
          <span className="card-tag">Account contexts</span>
          <h3>Named contexts such as work or personal</h3>
          {view.accountContexts.length ? (
            <div className="context-list">
              {view.accountContexts.map((accountContext) => (
                <div className="context-item" key={accountContext.id}>
                  <div className="context-item-top">
                    <h3>{accountContext.label}</h3>
                    <div className="context-item-meta">
                      <span>{accountContext.accountType}</span>
                      {accountContext.isDefault ? <span>default</span> : null}
                    </div>
                  </div>
                  <p>{accountContext.description ?? "No description yet."}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No account contexts have been named yet.</p>
          )}
        </article>
      </div>
    </AppShell>
  );
}
