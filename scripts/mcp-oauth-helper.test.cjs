const test = require("node:test");
const assert = require("node:assert/strict");

const {
  safeUrlForLogs,
  __testing
} = require("./mcp-oauth-helper.cjs");

test("safeUrlForLogs redacts sensitive callback parameters", () => {
  const redacted = safeUrlForLogs(
    "http://127.0.0.1:43123/callback?code=secret-code&state=ok&refresh_token=also-secret"
  );

  assert.equal(
    redacted,
    "http://127.0.0.1:43123/callback?code=REDACTED&state=ok&refresh_token=REDACTED"
  );
});

test("computeExpiresAt returns an ISO timestamp when expires_in is present", () => {
  const value = __testing.computeExpiresAt({ expires_in: 60 });
  assert.ok(typeof value === "string");
  assert.ok(!Number.isNaN(Date.parse(value)));
});

test("isTokenFresh treats near-expiry tokens as stale", () => {
  const stale = {
    tokens: {
      expires_at: new Date(Date.now() + 1000).toISOString()
    }
  };

  assert.equal(__testing.isTokenFresh(stale), false);
});

test("deviceAuthorizationEndpointFromMetadata returns undefined when absent", () => {
  assert.equal(__testing.deviceAuthorizationEndpointFromMetadata({}), undefined);
});

test("deviceAuthorizationEndpointFromMetadata returns a URL when present", () => {
  const endpoint = __testing.deviceAuthorizationEndpointFromMetadata({
    device_authorization_endpoint: "https://auth.example.com/oauth/device/code"
  });

  assert.equal(endpoint?.toString(), "https://auth.example.com/oauth/device/code");
});
