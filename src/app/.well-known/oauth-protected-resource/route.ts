import { baseUrl, mcpAudience } from "@/lib/oauth";

export const runtime = "nodejs";

function payload() {
  return {
    resource: mcpAudience(),
    authorization_servers: [baseUrl()]
  };
}

export async function GET() {
  return Response.json(payload());
}
