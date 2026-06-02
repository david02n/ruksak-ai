const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { ensureAccessToken } = require("./mcp-oauth-helper.cjs");

function parseArgs(argv) {
  const args = {
    target: undefined,
    forceOAuth: false,
    mode: "loopback_pkce"
  };

  for (const value of argv) {
    if (value === "--oauth") {
      args.forceOAuth = true;
      continue;
    }

    if (value === "--device-code") {
      args.forceOAuth = true;
      args.mode = "device_code";
      continue;
    }

    if (!args.target) {
      args.target = value;
    }
  }

  return args;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const target = parsed.target ?? "http://localhost:3000/api/mcp";
  const forceOAuth = parsed.forceOAuth || process.env.RUKSAK_USE_OAUTH === "true";
  let accessToken = process.env.MCP_API_KEY;

  if (!accessToken && forceOAuth) {
    console.log("Starting MCP OAuth flow...");

    const authResult = await ensureAccessToken({
      serverUrl: target,
      clientName: "ruksak-smoke-client",
      preferredMode: parsed.mode
    });

    if (authResult.startResult?.mode === "loopback_pkce") {
      console.log(`Browser opened. Waiting for callback on ${authResult.startResult.redirectUri}`);
    }

    if (authResult.startResult?.mode === "device_code") {
      console.log(`Open ${authResult.startResult.verificationUri} and enter code ${authResult.startResult.userCode}`);
    }

    console.log("OAuth authorization succeeded.");
    accessToken = authResult.accessToken;
  }

  const client = new Client({
    name: "ruksak-smoke-client",
    version: "0.1.0"
  });
  const transport = new StreamableHTTPClientTransport(new URL(target), {
    requestInit: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
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
