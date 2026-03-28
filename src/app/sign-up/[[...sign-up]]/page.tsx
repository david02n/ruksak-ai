import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/app"
          />
        </div>
      </section>
    </main>
  );
}
