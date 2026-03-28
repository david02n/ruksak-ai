"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export default function OnboardingPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const mcpUrl = "https://www.ruksak.ai/api/mcp";
  const mcpJsonFull = `{
  "mcpServers": {
    "ruksak": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://www.ruksak.ai/api/mcp"
      ]
    }
  }
}`;

  const mcpJsonSingle = `"ruksak": {
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "https://www.ruksak.ai/api/mcp"
  ]
}`;

  return (
    <AppShell
      eyebrow="You're signed up"
      title="Connect Ruksak to your AI tool"
      copy="You have no context yet-that&apos;s normal. Onboarding happens through your AI agents. Here&apos;s how to connect:"
    >
      <div className="card-grid single-card-grid">
        <article className="card">
          <span className="card-tag">ChatGPT / Claude apps</span>
          <h3>Simple link</h3>
          <p>Paste this link into your AI tool&apos;s MCP settings:</p>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
            <code style={{ flex: 1, padding: "8px", background: "#f5f5f5", borderRadius: "4px" }}>
              {mcpUrl}
            </code>
            <button
              className="button-secondary"
              onClick={() => copyToClipboard(mcpUrl, "url")}
              style={{ whiteSpace: "nowrap" }}
            >
              {copied === "url" ? "Copied!" : "Copy"}
            </button>
          </div>
        </article>

        <article className="card">
          <span className="card-tag">Windsurf / Cursor / Desktop tools</span>
          <h3>Full config</h3>
          <p>Add this to your MCP config file:</p>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "12px" }}>
            <pre style={{ 
              flex: 1, 
              padding: "12px", 
              background: "#f5f5f5", 
              borderRadius: "4px",
              overflow: "auto",
              fontSize: "13px",
              margin: 0
            }}>
              {mcpJsonFull}
            </pre>
            <button
              className="button-secondary"
              onClick={() => copyToClipboard(mcpJsonFull, "full")}
              style={{ whiteSpace: "nowrap" }}
            >
              {copied === "full" ? "Copied!" : "Copy"}
            </button>
          </div>
        </article>

        <article className="card">
          <span className="card-tag">Adding to existing config</span>
          <h3>Single server entry</h3>
          <p>If you already have other MCP servers configured:</p>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "12px" }}>
            <pre style={{ 
              flex: 1, 
              padding: "12px", 
              background: "#f5f5f5", 
              borderRadius: "4px",
              overflow: "auto",
              fontSize: "13px",
              margin: 0
            }}>
              {mcpJsonSingle}
            </pre>
            <button
              className="button-secondary"
              onClick={() => copyToClipboard(mcpJsonSingle, "single")}
              style={{ whiteSpace: "nowrap" }}
            >
              {copied === "single" ? "Copied!" : "Copy"}
            </button>
          </div>
        </article>

        <article className="card">
          <span className="card-tag">What&apos;s next</span>
          <h3>Start working</h3>
          <p><strong>Your browser will handle sign-in when your MCP client connects.</strong></p>
          <p style={{ marginTop: "12px" }}>
            Once connected, just start working. Your AI agent will guide you through adding context conversationally. Have fun.
          </p>
        </article>
      </div>
    </AppShell>
  );
}
