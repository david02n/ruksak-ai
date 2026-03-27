function optionalEnv(name: string) {
  return process.env[name];
}

function requiredEnv(name: string) {
  const value = optionalEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  authSecret: optionalEnv("AUTH_SECRET"),
  authUrl: optionalEnv("AUTH_URL"),
  googleClientId: optionalEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: optionalEnv("GOOGLE_CLIENT_SECRET"),
  posthogKey: optionalEnv("POSTHOG_TOKEN") ?? optionalEnv("NEXT_PUBLIC_POSTHOG_KEY"),
  posthogHost: optionalEnv("POSTHOG_HOST") ?? optionalEnv("NEXT_PUBLIC_POSTHOG_HOST"),
  deepseekApiKey: optionalEnv("DEEPSEEK_API"),
  deepseekModel: optionalEnv("DEEPSEEK_MODEL"),
  databaseUrl: optionalEnv("DATABASE_URL"),
  redisUrl: optionalEnv("REDIS_URL"),
  mcpApiKey: optionalEnv("MCP_API_KEY")
};

export const required = {
  databaseUrl: () => requiredEnv("DATABASE_URL"),
  redisUrl: () => requiredEnv("REDIS_URL")
};
