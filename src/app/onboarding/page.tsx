import { AppShell } from "@/components/app-shell";

export default function OnboardingPage() {
  return (
    <AppShell
      eyebrow="Onboarding"
      title="Draft the first durable profile"
      copy="This is where we will collect direct user input, imported context, and host signals to create the first reviewable Ruksak profile."
    >
      <div className="card-grid single-card-grid">
        <article className="card">
          <span className="card-tag">Launch flow</span>
          <h3>Direct input</h3>
          <p>Name, role, working style, active projects, priorities, and common tools.</p>
        </article>
        <article className="card">
          <span className="card-tag">Launch flow</span>
          <h3>Imported context</h3>
          <p>Pasted notes, docs, and handoff summaries become candidate durable context.</p>
        </article>
      </div>
    </AppShell>
  );
}
