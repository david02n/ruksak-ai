# Ruksak.ai

Ruksak.ai is a portable context layer for AI-native work.

This repository now contains the active application workspace for the Ruksak MCP product, private control surface, and OAuth-backed MCP access flow.

## Current status

- Next.js app scaffolded with a public landing page and authenticated `/app` workspace
- Clerk-backed auth wired into the private control surface
- MCP server implemented with:
  - `open_ruksak`
  - `update_ruksak_context`
  - `create_project_context`
- Project-resolution heuristics implemented for project, multi-project, portfolio, user, and new-project-candidate modes
- Client adaptation implemented for Codex, Cursor, Windsurf, and default clients
- OAuth discovery metadata routes implemented under `/.well-known/*`
- Context write risk classification implemented for low/medium/high-risk updates
- Tests exist for OAuth core behavior, project resolution, open-ruksak envelope composition, auth, routing, and update risk
- Railway and database setup files are present, but local validation is currently blocked by the Node runtime in this workspace:
  - local `node -v` is `v20.18.1`
  - current test scripts use `--experimental-strip-types`, which this runtime does not support

## MCP OAuth smoke flow

Use the native-client smoke script to authenticate without copying callback URLs or authorization codes by hand:

```bash
npm run mcp:smoke:oauth -- http://localhost:3000/api/mcp
```

Fallback device flow can be requested explicitly:

```bash
node ./scripts/mcp-smoke.cjs http://localhost:3000/api/mcp --device-code
```

Notes:

- Loopback PKCE is the default path and opens the system browser, listens on a random `127.0.0.1` port, captures the callback locally, and stores tokens on the authenticating machine.
- On Windows, tokens are persisted with DPAPI user protection. On other platforms, insecure plaintext persistence is blocked by default unless `RUKSAK_ALLOW_INSECURE_TOKEN_STORE=true` is set for temporary local development.
- Device flow only works when the authorization server advertises a `device_authorization_endpoint`.

## Immediate next steps

1. Finish the current MCP/OAuth/app route changes already in progress
2. Move write flows from direct persistence toward proposal-backed review for high-risk changes
3. Add a review queue and lightweight admin controls in the authenticated app
4. Align the local/runtime test environment with the configured TypeScript test scripts
5. Run a full MCP smoke check and deployment verification once runtime alignment is fixed

## Request current context

Use the MCP tool `open_ruksak` to fetch the current working context.

Minimal example:

```json
{
  "client": "codex",
  "repo": "david02n/ruksak-ai",
  "cwd": "D:/Developer/ruksak-ai",
  "request_text": "review ruksak mcp directly and give me the current context"
}
```

Useful optional hints:

- `project_id`
- `project_slug`
- `project_type`
- `repo`
- `cwd`
- `request_text`

The response is designed to return:

- resolved context mode
- focused project or candidate projects
- active work items and current priorities
- recent lessons, decisions, references, and updates
- suggested next actions
