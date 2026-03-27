import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTH_REASON_CODES,
  isAcceptedAudience,
  normalizeResourceIdentifier,
  parseScopes,
  validateMcpOAuthTokenAgainstConfig
} from "./auth-core.ts";

const now = Date.now();
const acceptedAudiences = [
  normalizeResourceIdentifier("https://www.ruksak.ai/api/mcp"),
  normalizeResourceIdentifier("https://www.ruksak.ai")
].filter((value): value is string => Boolean(value));
const acceptedAudience = acceptedAudiences[0] ?? "https://www.ruksak.ai/api/mcp";

function validToken(
  overrides: Partial<Parameters<typeof validateMcpOAuthTokenAgainstConfig>[0]["token"]> = {}
) {
  return {
    clientId: "chatgpt-client",
    userId: "user-123",
    scope: "openid email profile mcp:tools",
    audience: acceptedAudience,
    issuer: "https://www.ruksak.ai",
    subject: "user-123",
    expiresAt: new Date(now + 60_000),
    ...overrides
  };
}

test("accepts valid token with canonical audience", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken(),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, true);
});

test("accepts valid token with trailing slash audience variant", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken({
      audience: `${acceptedAudience}/`
    }),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, true);
});

test("rejects wrong audience", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken({
      audience: "https://evil.example.com/mcp"
    }),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, AUTH_REASON_CODES.AUDIENCE_MISMATCH);
});

test("rejects missing audience", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken({
      audience: null
    }),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, AUTH_REASON_CODES.AUDIENCE_MISMATCH);
});

test("rejects missing scope", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken({
      scope: "openid email profile"
    }),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, AUTH_REASON_CODES.SCOPE_MISSING);
});

test("rejects expired token", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken({
      expiresAt: new Date(now - 1000)
    }),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, AUTH_REASON_CODES.TOKEN_EXPIRED);
});

test("rejects future nbf", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken({
      notBefore: new Date(now + 60_000)
    }),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, AUTH_REASON_CODES.TOKEN_NOT_YET_VALID);
});

test("rejects invalid issuer", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken({
      issuer: "https://issuer.example.com"
    }),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, AUTH_REASON_CODES.ISSUER_MISMATCH);
});

test("accepts aud as array", () => {
  const result = validateMcpOAuthTokenAgainstConfig({
    token: validToken({
      audience: ["https://other.example.com", acceptedAudience]
    }),
    acceptedAudiences,
    expectedIssuer: "https://www.ruksak.ai"
  });
  assert.equal(result.ok, true);
});

test("scope parsing supports space-delimited strings", () => {
  assert.deepEqual(parseScopes("openid email mcp:tools"), [
    "openid",
    "email",
    "mcp:tools"
  ]);
});

test("scope parsing supports array claims", () => {
  assert.deepEqual(parseScopes(["openid", "email", "mcp:tools"]), [
    "openid",
    "email",
    "mcp:tools"
  ]);
});

test("accepted audience helper matches exact equivalent variants only", () => {
  assert.equal(isAcceptedAudience(`${acceptedAudience}/`, acceptedAudiences), true);
  assert.equal(isAcceptedAudience("https://example.com", acceptedAudiences), false);
});
