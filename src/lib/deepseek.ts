import "server-only";

import { env } from "@/lib/env.ts";

export type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export function isDeepSeekConfigured() {
  return Boolean(env.deepseekApiKey);
}

export async function callDeepSeekJson(input: {
  system: string;
  user: string;
  temperature?: number;
}) {
  if (!env.deepseekApiKey) {
    throw new Error("DeepSeek is not configured.");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.deepseekApiKey}`
    },
    body: JSON.stringify({
      model: env.deepseekModel ?? "deepseek-chat",
      temperature: input.temperature ?? 0.1,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content: input.system
        },
        {
          role: "user",
          content: input.user
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as DeepSeekResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("DeepSeek returned no content.");
  }

  return JSON.parse(content) as Record<string, unknown>;
}
