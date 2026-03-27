import { AppShell } from "@/components/app-shell";

export default function ReviewPage() {
  return (
    <AppShell
      eyebrow="Review"
      title="Approve changes before they become durable"
      copy="The review queue is the trust layer of the product. Candidate updates should stay small, frequent, and easy to understand."
    >
      <div className="card-grid single-card-grid">
        <article className="card">
          <span className="card-tag">Pending</span>
          <h3>No review items yet</h3>
          <p>
            Once extraction and comparison are wired, this page will show additions,
            edits, merges, and dismissals waiting for user action.
          </p>
        </article>
      </div>
    </AppShell>
  );
}
