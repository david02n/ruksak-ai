import { signIn } from "next-auth/react";

import { createPasswordCredential } from "@/lib/ruksak-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name : "";
  const callbackUrl =
    typeof body.callbackUrl === "string" ? body.callbackUrl : "/app";

  if (!email || !password) {
    return Response.json(
      {
        error: "Email and password are required."
      },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json(
      {
        error: "Password must be at least 8 characters."
      },
      { status: 400 }
    );
  }

  try {
    await createPasswordCredential({
      email,
      password,
      name: name || null
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create account."
      },
      { status: 400 }
    );
  }

  return Response.json({
    ok: true,
    redirectTo: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
  });
}
