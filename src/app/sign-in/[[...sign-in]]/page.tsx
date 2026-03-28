import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/app"
          />
        </div>
      </section>
    </main>
  );
}
