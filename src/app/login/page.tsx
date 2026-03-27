import { SignIn } from "@clerk/nextjs";
import { PostHogPageEvent } from "@/components/posthog-page-event";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="page-shell auth-shell" id="signin">
      <PostHogPageEvent event="login_page_viewed" />
      <section className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <SignIn 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none"
              }
            }}
            routing="path"
            path="/login"
            signUpUrl="/signup"
            fallbackRedirectUrl="/onboarding"
          />
        </div>
      </section>
    </main>
  );
}
