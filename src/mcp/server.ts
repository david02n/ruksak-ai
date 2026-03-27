import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  type McpSessionContext,
  openRuksak,
  updateRuksakContext
} from "@/mcp/open-ruksak";

function toTextBlock(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text
      }
    ]
  };
}

export function createRuksakMcpServer(userId?: string) {
  const session: McpSessionContext | undefined = userId
    ? {
        userId,
        transportType: "streamable_http"
      }
    : undefined;
  return createSessionBoundRuksakMcpServer(session);
}

export function createSessionBoundRuksakMcpServer(session?: McpSessionContext) {
  const server = new McpServer({
    name: "ruksak-ai",
    version: "0.1.0",
    title: "Ruksak",
    websiteUrl: "https://www.ruksak.ai"
  });

  server.registerTool(
    "open_ruksak",
    {
      description:
        "Resolve user and project context, normalize it into stable semantic roles, and return a client-adapted current working state from Ruksak.",
      inputSchema: {
        client: z
          .string()
          .optional()
          .describe("Optional client hint such as codex, cursor, or windsurf."),
        project_id: z.string().optional().describe("Optional project id hint."),
        project_slug: z.string().optional().describe("Optional project slug hint."),
        project_type: z
          .enum(["build", "workstream", "foundation", "operating_model"])
          .optional()
          .describe("Optional project type hint used to narrow project resolution."),
        repo: z.string().optional().describe("Optional repository hint such as owner/name."),
        cwd: z.string().optional().describe("Optional working directory hint from the client."),
        request_text: z
          .string()
          .optional()
          .describe("Optional request text used to validate project inference.")
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async (arguments_) => {
      if (!session?.userId) {
        return toTextBlock(
          JSON.stringify(
            {
              error: "open_ruksak requires an authenticated MCP session."
            },
            null,
            2
          )
        );
      }

      const response = await openRuksak(arguments_, session);
      return toTextBlock(JSON.stringify(response, null, 2));
    }
  );

  server.registerTool(
    "update_ruksak_context",
    {
      description:
        "Create or update a durable Ruksak context item so future open_ruksak calls return meaningful working state.",
      inputSchema: {
        title: z.string().min(1).describe("Short title for the context item."),
        summary: z.string().min(1).describe("Concise durable summary of the context item."),
        kind_key: z
          .enum(["summary", "work_item", "lesson", "decision", "reference"])
          .describe("Stable context kind to persist."),
        semantic_role: z
          .enum(["summary", "work_item", "lesson", "decision", "reference"])
          .optional()
          .describe("Optional semantic role override. Defaults to the kind key."),
        entity_type: z
          .string()
          .optional()
          .describe("Optional underlying entity type override such as task, learning, or reference."),
        project_id: z.string().optional().describe("Optional project id hint."),
        project_slug: z.string().optional().describe("Optional project slug hint."),
        project_name: z
          .string()
          .optional()
          .describe("Optional project name used if the project needs to be created."),
        project_type: z
          .enum(["build", "workstream", "foundation", "operating_model"])
          .optional()
          .describe("Optional project type used for creation and routing."),
        parent_project_id: z
          .string()
          .optional()
          .describe("Optional parent project id used to group workstreams or foundations."),
        account_context_id: z
          .string()
          .optional()
          .describe("Optional account context id override for provenance and routing."),
        account_context_slug: z
          .string()
          .optional()
          .describe("Optional account context slug override for provenance and routing."),
        repo: z.string().optional().describe("Optional repository hint such as owner/name."),
        cwd: z.string().optional().describe("Optional working directory hint."),
        request_text: z
          .string()
          .optional()
          .describe("Optional request text to help project resolution."),
        provenance_type: z
          .enum([
            "source_material",
            "synthesized_context",
            "operating_rule",
            "strategic_doctrine",
            "meta_system_design"
          ])
          .optional()
          .describe("Optional provenance classification for the durable context item."),
        source_project_id: z
          .string()
          .optional()
          .describe("Optional source project id when this item is derived from another project."),
        source_ref: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional structured source reference for imported or derived material."),
        priority: z.string().optional().describe("Optional priority such as urgent, high, medium, or low."),
        status: z.string().optional().describe("Optional status such as active, blocked, or done."),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional structured metadata for the context item.")
      }
    },
    async (arguments_) => {
      if (!session?.userId) {
        return toTextBlock(
          JSON.stringify(
            {
              error: "update_ruksak_context requires an authenticated MCP session."
            },
            null,
            2
          )
        );
      }

      const response = await updateRuksakContext(arguments_, session);
      return toTextBlock(JSON.stringify(response, null, 2));
    }
  );

  return server;
}
