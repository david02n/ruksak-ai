import { baseUrl, mcpAudience } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    resource: mcpAudience(),
    authorization_servers: [baseUrl()]
  });
}
