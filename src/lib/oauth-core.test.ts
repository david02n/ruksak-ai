import test from "node:test";
import assert from "node:assert/strict";

import {
  isSecureRedirectUri,
  isLoopbackRedirectUri,
  resolveTokenEndpointAuthMethod
} from "./oauth-core.ts";

test("recognizes localhost and 127.0.0.1 loopback redirects", () => {
  assert.equal(isLoopbackRedirectUri("http://127.0.0.1:53828/callback"), true);
  assert.equal(isLoopbackRedirectUri("http://localhost:3000/callback"), true);
  assert.equal(isLoopbackRedirectUri("https://www.ruksak.ai/callback"), false);
});

test("recognizes secure https redirects", () => {
  assert.equal(isSecureRedirectUri("https://chat.openai.com/aip/callback"), true);
  assert.equal(isSecureRedirectUri("https://chatgpt.com/aip/callback"), true);
  assert.equal(isSecureRedirectUri("http://example.com/callback"), false);
});

test("keeps public PKCE auth for loopback clients requesting none", () => {
  const method = resolveTokenEndpointAuthMethod({
    requestedAuthMethod: "none",
    redirectUris: ["http://127.0.0.1:53828/callback"]
  });

  assert.equal(method, "none");
});

test("keeps public PKCE auth for secure hosted clients requesting none", () => {
  const method = resolveTokenEndpointAuthMethod({
    requestedAuthMethod: "none",
    redirectUris: ["https://chat.openai.com/aip/callback"]
  });

  assert.equal(method, "none");
});

test("defaults secure hosted clients to public PKCE when auth method is omitted", () => {
  const method = resolveTokenEndpointAuthMethod({
    redirectUris: ["https://chatgpt.com/aip/callback"]
  });

  assert.equal(method, "none");
});

test("falls back to confidential auth for insecure non-loopback redirects", () => {
  const method = resolveTokenEndpointAuthMethod({
    requestedAuthMethod: "none",
    redirectUris: ["http://example.com/callback"]
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
