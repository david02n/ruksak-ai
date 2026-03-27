import "server-only";

import Redis from "ioredis";

import { env } from "@/lib/env";

const globalForRedis = globalThis as typeof globalThis & {
  __ruksakRedis?: Redis;
};

export function getRedis() {
  if (!env.redisUrl) {
    return null;
  }

  const client =
    globalForRedis.__ruksakRedis ??
    new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });

  if (process.env.NODE_ENV !== "production") {
    globalForRedis.__ruksakRedis = client;
  }

  return client;
}
