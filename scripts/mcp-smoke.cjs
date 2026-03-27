const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function main() {
  const target = process.argv[2] ?? "http://localhost:3000/api/mcp";
  const apiKey = process.env.MCP_API_KEY;
  const client = new Client({
    name: "ruksak-smoke-client",
    version: "0.1.0"
  });
  const transport = new StreamableHTTPClientTransport(new URL(target), {
    requestInit: apiKey
      ? {
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        }
      : undefined
  });

  await client.connect(transport);

  const tools = await client.listTools();
  console.log("tools", tools.tools.map((tool) => tool.name));

  const current = await client.callTool({
    name: "open_ruksak",
    arguments: {}
  });
  console.log("open_ruksak", JSON.stringify(current.content, null, 2));

  await transport.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
