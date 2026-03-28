import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="page-shell auth-shell">
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/app"
        />
      </div>
    </main>
  );
}
