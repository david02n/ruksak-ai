import { landingCopy } from "@/content/landing";
import { LogoMark } from "@/components/logo-mark";
import { McpCopyButton } from "@/components/mcp-copy-button";
import { PostHogPageEvent } from "@/components/posthog-page-event";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="simple-landing">
      <PostHogPageEvent event="landing_page_viewed" />
      <section className="simple-hero">
        <div className="simple-logo">
          <LogoMark priority size={44} />
          <span>{landingCopy.logo}</span>
        </div>

        <h1 className="simple-title">{landingCopy.snapLine}</h1>
        <p className="simple-why">{landingCopy.whyThisExists}</p>
        <div className="cta-row">
          <Show when="signed-out">
            <SignInButton mode="redirect" fallbackRedirectUrl="/app">
              <button className="button" type="button">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect" fallbackRedirectUrl="/app">
              <button className="button-secondary" type="button">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link className="button" href="/app">
              Open app
            </Link>
            <UserButton />
          </Show>
        </div>

        <section className="simple-card">
          <span className="simple-label">{landingCopy.mcpLabel}</span>
          <h2 className="simple-card-title">{landingCopy.mcpTitle}</h2>
          <p className="simple-copy">{landingCopy.mcpCopy}</p>

          <div className="simple-mcp-row">
            <code className="simple-code">{landingCopy.mcpLink}</code>
            <McpCopyButton
              defaultLabel={landingCopy.buttonLabel}
              successLabel={landingCopy.buttonSuccess}
              value={landingCopy.mcpLink}
            />
          </div>
        </section>

        <section className="simple-card">
          <span className="simple-label">{landingCopy.desktopSetup.label}</span>
          <h2 className="simple-card-title">{landingCopy.desktopSetup.title}</h2>
          <p className="simple-copy">{landingCopy.desktopSetup.copy}</p>

          <div className="simple-mcp-row" style={{ marginTop: "16px" }}>
            <pre className="simple-code" style={{ 
              flex: 1, 
              padding: "12px", 
              fontSize: "13px",
              overflow: "auto",
              whiteSpace: "pre"
            }}>
              {landingCopy.desktopSetup.mcpJsonConfig}
            </pre>
            <McpCopyButton
              defaultLabel={landingCopy.desktopSetup.ctaLabel}
              successLabel={landingCopy.buttonSuccess}
              value={landingCopy.desktopSetup.mcpJsonConfig}
            />
          </div>
        </section>

        <section className="simple-card">
          <span className="simple-label">{landingCopy.getStartedLabel}</span>
          <h2 className="simple-card-title">{landingCopy.getStartedTitle}</h2>

          <div className="simple-steps">
            {landingCopy.steps.map((step, index) => (
              <article className="simple-step" key={step.title}>
                <span className="simple-step-number">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
