import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { createMcpTokenForUser, ensureUserRecord } from "@/lib/ruksak-users";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();

  if (!clerkUser?.primaryEmailAddress?.emailAddress) {
    redirect("/login");
  }

  const user = await ensureUserRecord({
    email: clerkUser.primaryEmailAddress.emailAddress,
    name: clerkUser.fullName,
    image: clerkUser.imageUrl
  });

  if (!user) {
    throw new Error("Could not create or load your Ruksak user.");
  }

  const created = await createMcpTokenForUser(user.id, "ChatGPT and Codex access");

  redirect(`/app/access?token=${encodeURIComponent(created.token)}`);
}
