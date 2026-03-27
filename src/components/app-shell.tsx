import { AppNav } from "@/components/app-nav";

type AppShellProps = {
  eyebrow: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
};

export function AppShell({ eyebrow, title, copy, children }: AppShellProps) {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="section-title">{title}</h1>
        <p className="section-copy">{copy}</p>
        <AppNav />
        {children}
      </section>
    </main>
  );
}
