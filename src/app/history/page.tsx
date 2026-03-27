import { AppShell } from "@/components/app-shell";

export default function HistoryPage() {
  return (
    <AppShell
      eyebrow="History"
      title="Track durable mutations with context"
      copy="Every important create, update, merge, approval, and dismissal should leave a trace the user can inspect later."
    >
      <div className="card-grid single-card-grid">
        <article className="card">
          <span className="card-tag">Ledger</span>
          <h3>Change event stream</h3>
          <p>
            This page will show what changed, when it changed, and what actor or
            workflow caused it.
          </p>
        </article>
      </div>
    </AppShell>
  );
}
