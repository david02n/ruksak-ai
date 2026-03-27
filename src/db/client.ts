import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";

const globalForDb = globalThis as typeof globalThis & {
  __ruksakDb?: ReturnType<typeof drizzle>;
  __ruksakPool?: Pool;
};

function createPool() {
  if (!env.databaseUrl) {
    return null;
  }

  const pool =
    globalForDb.__ruksakPool ??
    new Pool({
      connectionString: env.databaseUrl,
      max: 5
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__ruksakPool = pool;
  }

  return pool;
}

export function getDb() {
  if (globalForDb.__ruksakDb) {
    return globalForDb.__ruksakDb;
  }

  const pool = createPool();

  if (!pool) {
    return null;
  }

  const database = drizzle(pool);

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__ruksakDb = database;
  }

  return database;
}

export const db = getDb();
