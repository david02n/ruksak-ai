import { EmailPasswordForm } from "@/components/email-password-form";
import { PostHogPageEvent } from "@/components/posthog-page-event";
import { SignInButton } from "@/components/sign-in-button";
import { SignupForm } from "@/components/signup-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const callbackUrl =
    typeof params.callbackUrl === "string"
      ? params.callbackUrl
      : typeof params.returnTo === "string"
        ? params.returnTo
      : undefined;

  return (
    <main className="page-shell auth-shell" id="signin">
      <PostHogPageEvent event="login_page_viewed" />
      <section className="auth-card">
        <span className="eyebrow">Sign in</span>
        <h1 className="section-title">Sign in to Ruksak.ai</h1>
        <p className="section-copy">
          Google is the default sign-in method. Email and password are also available.
        </p>
        <div className="cta-row">
          <SignInButton callbackUrl={callbackUrl} />
        </div>
        <div className="card-grid single-card-grid auth-grid">
          <article className="card">
            <span className="card-tag">Email</span>
            <h3>Email sign-in</h3>
            <EmailPasswordForm callbackUrl={callbackUrl} />
          </article>
          <article className="card" id="signup">
            <span className="card-tag">New</span>
            <h3>Create account</h3>
            <SignupForm callbackUrl={callbackUrl} />
          </article>
        </div>
      </section>
    </main>
  );
}
