import test from "node:test";
import assert from "node:assert/strict";

import {
  isLoopbackRedirectUri,
  resolveTokenEndpointAuthMethod
} from "./oauth-core.ts";

test("recognizes localhost and 127.0.0.1 loopback redirects", () => {
  assert.equal(isLoopbackRedirectUri("http://127.0.0.1:53828/callback"), true);
  assert.equal(isLoopbackRedirectUri("http://localhost:3000/callback"), true);
  assert.equal(isLoopbackRedirectUri("https://www.ruksak.ai/callback"), false);
});

test("keeps public PKCE auth for loopback clients requesting none", () => {
  const method = resolveTokenEndpointAuthMethod({
    requestedAuthMethod: "none",
    redirectUris: ["http://127.0.0.1:53828/callback"]
  });

  assert.equal(method, "none");
});

test("keeps confidential auth for non-loopback clients", () => {
  const method = resolveTokenEndpointAuthMethod({
    requestedAuthMethod: "none",
    redirectUris: ["https://chat.openai.com/aip/callback"]
  });

  assert.equal(method, "client_secret_post");
});

test("preserves explicit confidential auth methods", () => {
  const method = resolveTokenEndpointAuthMethod({
    requestedAuthMethod: "client_secret_post",
    redirectUris: ["http://127.0.0.1:53828/callback"]
  });

  assert.equal(method, "client_secret_post");
});
