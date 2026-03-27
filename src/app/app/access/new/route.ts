import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createMcpTokenForUser, ensureUserRecord } from "@/lib/ruksak-users";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await ensureUserRecord({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image
  });

  if (!user) {
    throw new Error("Could not create or load your Ruksak user.");
  }

  const created = await createMcpTokenForUser(user.id, "ChatGPT and Codex access");

  redirect(`/app/access?token=${encodeURIComponent(created.token)}`);
}
