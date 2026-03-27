# MCP Auth Debug Notes

## Canonical MCP resource identifier

- `https://www.ruksak.ai/api/mcp`

## Accepted audience forms

- `https://www.ruksak.ai/api/mcp`
- `https://www.ruksak.ai`

Trailing-slash equivalents are normalized and treated as identical.

## Expected scope claim shape

- Primary persisted shape: space-delimited `scope` string
- Supported equivalent shape in validation helpers: string or string array
- Required tool scope: `mcp:tools`

## Current reject reason codes

- `AUTH_MISSING_BEARER`
- `AUTH_TOKEN_NOT_FOUND`
- `AUTH_ISSUER_MISMATCH`
- `AUTH_AUDIENCE_MISMATCH`
- `AUTH_SCOPE_MISSING`
- `AUTH_SUBJECT_MISSING`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_TOKEN_NOT_YET_VALID`
- `AUTH_USER_RESOLUTION_FAILED`

## How to debug a reconnect loop

1. Check Railway logs for `component: "ruksak-mcp-auth"` events.
2. Find the latest `auth_rejected` event and inspect:
   - `reasonCode`
   - `issuer`
   - `audience`
   - `scopes`
   - `acceptedAudiences`
3. If OAuth succeeded but MCP still reconnects, compare the issued token's persisted:
   - `issuer`
   - `audience`
   - `scope`
   with the MCP route's accepted values.
4. Do not broaden accepted audiences beyond the canonical resource and exact observed production equivalents.

## Notes

Ruksak currently uses opaque access tokens persisted server-side rather than self-describing JWT access tokens. That means:

- issuer, audience, scope, subject, and expiry are validated from trusted persisted token metadata
- JWT signature validation is not applicable to the current token format
- any future JWT migration should preserve the same reason-code and normalization model
