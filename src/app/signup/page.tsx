import { SignUp } from "@clerk/nextjs";
import { PostHogPageEvent } from "@/components/posthog-page-event";

export default function SignupPage() {
  return (
    <main className="page-shell auth-shell" id="signup">
      <PostHogPageEvent event="signup_page_viewed" />
      <section className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <SignUp 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none"
              }
            }}
            routing="path"
            path="/signup"
            signInUrl="/login"
            fallbackRedirectUrl="/onboarding"
          />
        </div>
      </section>
    </main>
  );
}
