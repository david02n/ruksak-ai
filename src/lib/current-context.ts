import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { linkedAccountContexts, projects, users } from "@/db/schema";
import { openRuksak } from "@/mcp/open-ruksak";

export async function getUserByPrimaryEmail(email: string) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.primaryEmail, email.trim().toLowerCase()))
    .limit(1);

  return user ?? null;
}

export async function getCurrentContextView(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  const db = getDb();

  const [envelope, projectRows, accountContexts] = await Promise.all([
    openRuksak(
      {},
      {
        userId: input.userId,
        clientKey: "web_control_surface",
        clientLabel: "Web control surface",
        transportType: "web"
      }
    ),
    db
      ? db
          .select()
          .from(projects)
          .where(eq(projects.userId, input.userId))
      : Promise.resolve([]),
    db
      ? db
          .select()
          .from(linkedAccountContexts)
          .where(eq(linkedAccountContexts.userId, input.userId))
      : Promise.resolve([])
  ]);

  return {
    envelope,
    projects: projectRows,
    accountContexts
  };
}
