export const landingCopy = {
  logo: "Ruksak",
  snapLine: "Pack light. Carry the right context with you",
  whyThisExists: "No setup forms. No profile questionnaires. Just connect, start working, and let your AI agents learn your context.",
  mcpLabel: "MCP",
  mcpTitle: "Connect Ruksak once",
  mcpCopy:
    "Ruksak keeps the useful context and current focus portable across chats and agents, without flooding every session with extra information.",
  mcpLink: "https://www.ruksak.ai/api/mcp",
  buttonLabel: "Copy MCP link",
  buttonSuccess: "Copied",
  desktopSetup: {
    label: "Desktop setup",
    title: "For Windsurf, Cursor, desktop tools",
    copy: "Add this to your MCP config file:",
    mcpJsonConfig: `{
  "mcpServers": {
    "ruksak": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://www.ruksak.ai/api/mcp"]
    }
  }
}`,
    ctaLabel: "Copy config",
    href: "/onboarding"
  },
  getStartedLabel: "Get started",
  getStartedTitle: "Sign up in seconds. Onboard through your agents.",
  steps: [
    {
      title: "Connect",
      copy: "Add the Ruksak MCP link to your AI tool."
    },
    {
      title: "Start working",
      copy: "Your AI agent will guide you conversationally to add context."
    },
    {
      title: "Stay focused",
      copy: "Context syncs automatically across chats and agents."
    }
  ]
} as const;
