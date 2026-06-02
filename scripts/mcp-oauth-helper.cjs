const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { createHash, randomUUID } = require("node:crypto");
const { spawn, execFileSync } = require("node:child_process");

const {
  discoverOAuthServerInfo,
  registerClient,
  startAuthorization,
  exchangeAuthorization,
  refreshAuthorization
} = require("@modelcontextprotocol/sdk/client/auth.js");

const CALLBACK_PATH = "/callback";
const DEFAULT_SCOPE = "openid email profile mcp:tools";
const DEFAULT_TIMEOUT_MS = 120000;
const REFRESH_SKEW_MS = 60000;
const DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

function createLogger(logger) {
  return logger ?? console;
}

function logInfo(logger, message, details) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  logger.info?.(`[ruksak-mcp-oauth] ${message}${payload}`);
}

function logWarn(logger, message, details) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  logger.warn?.(`[ruksak-mcp-oauth] ${message}${payload}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeUrlForLogs(urlLike) {
  const url = new URL(String(urlLike));
  for (const key of ["code", "access_token", "refresh_token", "id_token"]) {
    if (url.searchParams.has(key)) {
      url.searchParams.set(key, "REDACTED");
    }
  }

  return url.toString();
}

function normalizeServerKey(serverUrl) {
  const url = new URL(serverUrl);
  return sha256(url.origin + url.pathname.replace(/\/+$/, ""));
}

function computeExpiresAt(tokens) {
  if (typeof tokens.expires_in !== "number" || Number.isNaN(tokens.expires_in)) {
    return undefined;
  }

  return new Date(Date.now() + tokens.expires_in * 1000).toISOString();
}

function isTokenFresh(record) {
  if (!record?.tokens?.expires_at) {
    return true;
  }

  return new Date(record.tokens.expires_at).getTime() > Date.now() + REFRESH_SKEW_MS;
}

function authError(mode, errorCode, message, retryable, cause) {
  const error = new Error(message);
  error.mode = mode;
  error.errorCode = errorCode;
  error.retryable = retryable;
  error.cause = cause;
  return error;
}

function isWindows() {
  return process.platform === "win32";
}

function protectWithDpapi(plaintext) {
  const input = Buffer.from(plaintext, "utf8").toString("base64");
  const script =
    "$bytes=[Convert]::FromBase64String($env:RUKSAK_DATA);" +
    "$entropy=[Text.Encoding]::UTF8.GetBytes('ruksak-mcp-oauth');" +
    "$protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);" +
    "[Convert]::ToBase64String($protected)";

  return execFileSync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        RUKSAK_DATA: input
      }
    }
  ).trim();
}

function unprotectWithDpapi(ciphertext) {
  const script =
    "$bytes=[Convert]::FromBase64String($env:RUKSAK_DATA);" +
    "$entropy=[Text.Encoding]::UTF8.GetBytes('ruksak-mcp-oauth');" +
    "$plain=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);" +
    "[Text.Encoding]::UTF8.GetString($plain)";

  return execFileSync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        RUKSAK_DATA: ciphertext
      }
    }
  );
}

class LocalTokenStore {
  constructor(options = {}) {
    this.baseDir =
      options.baseDir ?? path.join(os.homedir(), ".ruksak", "oauth");
    this.allowInsecureStorage = options.allowInsecureStorage === true;
  }

  filePath(serverKey) {
    return path.join(this.baseDir, `${serverKey}.json`);
  }

  async load(serverKey) {
    try {
      const payload = await fs.readFile(this.filePath(serverKey), "utf8");

      if (isWindows()) {
        return JSON.parse(unprotectWithDpapi(payload));
      }

      return JSON.parse(payload);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return undefined;
      }

      throw error;
    }
  }

  async save(serverKey, record) {
    await fs.mkdir(this.baseDir, { recursive: true });

    if (!isWindows() && !this.allowInsecureStorage) {
      throw authError(
        "loopback_pkce",
        "SECURE_STORAGE_UNAVAILABLE",
        "Secure token persistence is unavailable on this platform. Set RUKSAK_ALLOW_INSECURE_TOKEN_STORE=true only for temporary local development.",
        false
      );
    }

    const serialized = JSON.stringify(record, null, 2);
    const payload = isWindows() ? protectWithDpapi(serialized) : serialized;

    await fs.writeFile(this.filePath(serverKey), payload, { mode: 0o600 });
  }

  async clear(serverKey) {
    try {
      await fs.unlink(this.filePath(serverKey));
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

function openSystemBrowser(url) {
  if (process.platform === "win32") {
    const child = spawn("cmd", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return;
  }

  const command = process.platform === "darwin" ? "open" : "xdg-open";
  const child = spawn(command, [url], {
    detached: true,
    stdio: "ignore"
  });
  child.on("error", () => {});
  child.unref();
}

async function createLoopbackListener({ state, timeoutMs, logger }) {
  return new Promise((resolve, reject) => {
    let timeout;
    let settled = false;
    let resolveCallback;
    let rejectCallback;
    const callbackPromise = new Promise((innerResolve, innerReject) => {
      resolveCallback = innerResolve;
      rejectCallback = innerReject;
    });

    function settleWithError(error) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      rejectCallback(error);
    }

    function settleWithCode(code) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolveCallback({ code });
    }

    const server = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");

        if (requestUrl.pathname !== CALLBACK_PATH) {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end("Not found.");
          return;
        }

        const code = requestUrl.searchParams.get("code") ?? undefined;
        const returnedState =
          requestUrl.searchParams.get("state") ?? undefined;
        const oauthError =
          requestUrl.searchParams.get("error") ?? undefined;
        const errorDescription =
          requestUrl.searchParams.get("error_description") ?? undefined;

        logInfo(logger, "callback_received", {
          callback: safeUrlForLogs(`http://127.0.0.1${req.url ?? CALLBACK_PATH}`)
        });

        if (oauthError) {
          res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
          res.end("<h1>Authentication failed</h1><p>You can close this window.</p>");
        } else {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end("<h1>Authentication complete</h1><p>You can close this window and return to your terminal.</p>");
        }

        server.close(() => {
          if (oauthError) {
            settleWithError(
              authError(
                "loopback_pkce",
                oauthError.toUpperCase(),
                errorDescription ?? "Authorization failed.",
                oauthError === "temporarily_unavailable"
              )
            );
            return;
          }

          if (!code) {
            settleWithError(
              authError(
                "loopback_pkce",
                "MISSING_CODE",
                "OAuth callback did not include an authorization code.",
                true
              )
            );
            return;
          }

          if (returnedState !== state) {
            settleWithError(
              authError(
                "loopback_pkce",
                "STATE_MISMATCH",
                "OAuth callback state did not match the original authorization request.",
                true
              )
            );
            return;
          }

          settleWithCode(code);
        });
      } catch (error) {
        settleWithError(
          authError(
            "loopback_pkce",
            "CALLBACK_PROCESSING_FAILED",
            "Failed to process the OAuth callback.",
            true,
            error
          )
        );
      }
    });

    server.on("error", (error) => {
      settleWithError(
        authError(
          "loopback_pkce",
          "LISTENER_BIND_FAILED",
          "Could not bind a loopback listener on localhost.",
          true,
          error
        )
      );
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        clearTimeout(timeout);
        server.close();
        reject(
          authError(
            "loopback_pkce",
            "LISTENER_BIND_FAILED",
            "Could not determine the loopback listener port.",
            true
          )
        );
        return;
      }

      timeout = setTimeout(() => {
        server.close(() => {
          settleWithError(
            authError(
              "loopback_pkce",
              "CALLBACK_TIMEOUT",
              "Timed out waiting for the OAuth callback from the browser.",
              true
            )
          );
        });
      }, timeoutMs);

      resolve({
        port: address.port,
        redirectUri: `http://127.0.0.1:${address.port}${CALLBACK_PATH}`,
        waitForCode: async () => callbackPromise,
        close: async () =>
          new Promise((resolveClose) => {
            clearTimeout(timeout);
            server.close(() => resolveClose());
          })
      });
    });
  });
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(async () => {
    const text = await response.text();
    return { raw: text };
  });

  if (!response.ok) {
    const message =
      typeof body.error_description === "string"
        ? body.error_description
        : `HTTP ${response.status} calling ${url}`;
    const code =
      typeof body.error === "string"
        ? body.error.toUpperCase()
        : `HTTP_${response.status}`;
    throw authError("device_code", code, message, response.status >= 500);
  }

  return body;
}

function deviceAuthorizationEndpointFromMetadata(metadata) {
  const candidate =
    metadata && typeof metadata.device_authorization_endpoint === "string"
      ? metadata.device_authorization_endpoint
      : undefined;

  return candidate ? new URL(candidate) : undefined;
}

function tokenEndpointFromMetadata(authorizationServerUrl, metadata) {
  if (metadata && typeof metadata.token_endpoint === "string") {
    return new URL(metadata.token_endpoint);
  }

  return new URL("/oauth/token", authorizationServerUrl);
}

function serializeTokens(tokens) {
  return {
    ...tokens,
    expires_at: computeExpiresAt(tokens)
  };
}

async function discover(serverUrl) {
  const serverInfo = await discoverOAuthServerInfo(serverUrl);
  const authorizationServerUrl = serverInfo.authorizationServerUrl;
  const metadata = serverInfo.authorizationServerMetadata;
  const resource = serverInfo.resourceMetadata?.resource
    ? new URL(serverInfo.resourceMetadata.resource)
    : undefined;

  return {
    authorizationServerUrl,
    metadata,
    resource,
    resourceMetadata: serverInfo.resourceMetadata
  };
}

async function ensureRefreshIfPossible({
  logger,
  store,
  serverKey,
  record
}) {
  if (!record?.tokens?.refresh_token) {
    return undefined;
  }

  if (isTokenFresh(record)) {
    return {
      accessToken: record.tokens.access_token,
      mode: record.mode ?? "loopback_pkce",
      expiresAt: record.tokens.expires_at,
      fromCache: true
    };
  }

  logInfo(logger, "refresh_started");

  try {
    const refreshed = await refreshAuthorization(record.authorizationServerUrl, {
      metadata: record.authorizationServerMetadata,
      clientInformation: record.clientInformation,
      refreshToken: record.tokens.refresh_token,
      resource: record.resource ? new URL(record.resource) : undefined
    });

    const nextRecord = {
      ...record,
      tokens: serializeTokens(refreshed)
    };

    await store.save(serverKey, nextRecord);
    logInfo(logger, "refresh_succeeded");

    return {
      accessToken: refreshed.access_token,
      mode: nextRecord.mode ?? "loopback_pkce",
      expiresAt: nextRecord.tokens.expires_at,
      fromCache: false
    };
  } catch (error) {
    logWarn(logger, "refresh_failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    await store.clear(serverKey);
    return undefined;
  }
}

async function startLoopbackPkceFlow({
  serverUrl,
  clientName,
  scope,
  timeoutMs,
  store,
  serverKey,
  logger
}) {
  const state = randomUUID();
  const listener = await createLoopbackListener({ state, timeoutMs, logger });
  logInfo(logger, "loopback_listener_started", { port: listener.port });

  try {
    const discovered = await discover(serverUrl);
    const clientInformation = await registerClient(discovered.authorizationServerUrl, {
      metadata: discovered.metadata,
      clientMetadata: {
        client_name: clientName,
        redirect_uris: [listener.redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope
      }
    });

    const { authorizationUrl, codeVerifier } = await startAuthorization(
      discovered.authorizationServerUrl,
      {
        metadata: discovered.metadata,
        clientInformation,
        redirectUrl: listener.redirectUri,
        scope,
        state,
        resource: discovered.resource
      }
    );

    logInfo(logger, "browser_open_requested", {
      authorizationUrl: safeUrlForLogs(authorizationUrl)
    });

    try {
      openSystemBrowser(authorizationUrl.toString());
    } catch (error) {
      await listener.close();
      throw authError(
        "loopback_pkce",
        "BROWSER_LAUNCH_FAILED",
        "Could not open the system browser for OAuth authorization.",
        true,
        error
      );
    }

    const startResult = {
      status: "started",
      mode: "loopback_pkce",
      authUrl: authorizationUrl.toString(),
      redirectUri: listener.redirectUri,
      listenerPort: listener.port
    };

    const callback = await listener.waitForCode();
    logInfo(logger, "token_exchange_started");

    const tokens = await exchangeAuthorization(discovered.authorizationServerUrl, {
      metadata: discovered.metadata,
      clientInformation,
      authorizationCode: callback.code,
      codeVerifier,
      redirectUri: listener.redirectUri,
      resource: discovered.resource
    });

    const record = {
      version: 1,
      mode: "loopback_pkce",
      serverUrl,
      authorizationServerUrl: discovered.authorizationServerUrl,
      authorizationServerMetadata: discovered.metadata,
      resource: discovered.resource?.toString(),
      clientInformation,
      tokens: serializeTokens(tokens)
    };

    await store.save(serverKey, record);
    logInfo(logger, "token_exchange_succeeded");

    return {
      startResult,
      completeResult: {
        status: "success",
        accessTokenStored: true,
        refreshTokenStored: typeof tokens.refresh_token === "string",
        expiresAt: record.tokens.expires_at,
        mode: "loopback_pkce"
      },
      accessToken: tokens.access_token
    };
  } finally {
    await listener.close().catch(() => {});
  }
}

async function startDeviceCodeFlow({
  serverUrl,
  clientName,
  scope,
  timeoutMs,
  store,
  serverKey,
  logger
}) {
  const discovered = await discover(serverUrl);
  const deviceEndpoint = deviceAuthorizationEndpointFromMetadata(discovered.metadata);

  if (!deviceEndpoint) {
    throw authError(
      "device_code",
      "DEVICE_CODE_UNSUPPORTED",
      "The authorization server does not advertise a device authorization endpoint.",
      false
    );
  }

  const clientInformation = await registerClient(discovered.authorizationServerUrl, {
    metadata: discovered.metadata,
    clientMetadata: {
      client_name: clientName,
      redirect_uris: [],
      grant_types: [DEVICE_GRANT_TYPE, "refresh_token"],
      token_endpoint_auth_method: "none",
      scope
    }
  });

  const requestBody = new URLSearchParams({
    client_id: clientInformation.client_id,
    scope
  });

  if (discovered.resource) {
    requestBody.set("resource", discovered.resource.toString());
  }

  const deviceStart = await requestJson(deviceEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: requestBody
  });

  const intervalMs =
    Math.max(Number(deviceStart.interval ?? 5), 1) * 1000;
  const expiresAtMs = Date.now() + Number(deviceStart.expires_in ?? 600) * 1000;

  const startResult = {
    status: "started",
    mode: "device_code",
    verificationUri:
      deviceStart.verification_uri_complete ?? deviceStart.verification_uri,
    userCode: deviceStart.user_code,
    expiresIn: Number(deviceStart.expires_in ?? 600),
    interval: Number(deviceStart.interval ?? 5)
  };

  logInfo(logger, "device_authorization_started", {
    verificationUri: startResult.verificationUri
  });

  let currentIntervalMs = intervalMs;

  while (Date.now() < Math.min(expiresAtMs, Date.now() + timeoutMs)) {
    await new Promise((resolve) => setTimeout(resolve, currentIntervalMs));

    const tokenParams = new URLSearchParams({
      grant_type: DEVICE_GRANT_TYPE,
      device_code: deviceStart.device_code,
      client_id: clientInformation.client_id
    });

    if (discovered.resource) {
      tokenParams.set("resource", discovered.resource.toString());
    }

    const response = await fetch(tokenEndpointFromMetadata(
      discovered.authorizationServerUrl,
      discovered.metadata
    ), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: tokenParams
    });

    const body = await response.json().catch(() => ({}));

    if (response.ok && typeof body.access_token === "string") {
      const tokens = serializeTokens(body);
      const record = {
        version: 1,
        mode: "device_code",
        serverUrl,
        authorizationServerUrl: discovered.authorizationServerUrl,
        authorizationServerMetadata: discovered.metadata,
        resource: discovered.resource?.toString(),
        clientInformation,
        tokens
      };

      await store.save(serverKey, record);
      logInfo(logger, "device_authorization_succeeded");

      return {
        startResult,
        completeResult: {
          status: "success",
          accessTokenStored: true,
          refreshTokenStored: typeof tokens.refresh_token === "string",
          expiresAt: tokens.expires_at,
          mode: "device_code"
        },
        accessToken: tokens.access_token
      };
    }

    if (body.error === "authorization_pending") {
      continue;
    }

    if (body.error === "slow_down") {
      currentIntervalMs += 5000;
      continue;
    }

    if (body.error === "expired_token") {
      throw authError(
        "device_code",
        "DEVICE_CODE_EXPIRED",
        "The device authorization request expired before it was approved.",
        true
      );
    }

    if (body.error === "access_denied") {
      throw authError(
        "device_code",
        "ACCESS_DENIED",
        "The device authorization request was denied.",
        false
      );
    }

    throw authError(
      "device_code",
      typeof body.error === "string" ? body.error.toUpperCase() : "TOKEN_POLL_FAILED",
      typeof body.error_description === "string"
        ? body.error_description
        : "Device authorization polling failed.",
      response.status >= 500
    );
  }

  throw authError(
    "device_code",
    "DEVICE_CODE_TIMEOUT",
    "Timed out waiting for device authorization approval.",
    true
  );
}

async function ensureAccessToken(options) {
  const {
    serverUrl,
    clientName = "Ruksak MCP native client",
    scope = DEFAULT_SCOPE,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    preferredMode = "loopback_pkce",
    allowInsecureStorage = process.env.RUKSAK_ALLOW_INSECURE_TOKEN_STORE === "true",
    logger = console
  } = options;

  const log = createLogger(logger);
  const store = new LocalTokenStore({ allowInsecureStorage });
  const serverKey = normalizeServerKey(serverUrl);
  const existing = await store.load(serverKey);
  const refreshed = await ensureRefreshIfPossible({
    logger: log,
    store,
    serverKey,
    record: existing
  });

  if (refreshed) {
    return {
      ...refreshed,
      startResult: undefined,
      completeResult: {
        status: "success",
        accessTokenStored: true,
        refreshTokenStored: Boolean(existing?.tokens?.refresh_token),
        expiresAt: refreshed.expiresAt,
        mode: refreshed.mode
      }
    };
  }

  if (preferredMode === "device_code") {
    return startDeviceCodeFlow({
      serverUrl,
      clientName,
      scope,
      timeoutMs,
      store,
      serverKey,
      logger: log
    });
  }

  try {
    return await startLoopbackPkceFlow({
      serverUrl,
      clientName,
      scope,
      timeoutMs,
      store,
      serverKey,
      logger: log
    });
  } catch (error) {
    if (
      error?.errorCode === "BROWSER_LAUNCH_FAILED" ||
      error?.errorCode === "LISTENER_BIND_FAILED"
    ) {
      logWarn(log, "loopback_unavailable_falling_back_to_device_code", {
        errorCode: error.errorCode
      });
      return startDeviceCodeFlow({
        serverUrl,
        clientName,
        scope,
        timeoutMs,
        store,
        serverKey,
        logger: log
      });
    }

    throw error;
  }
}

module.exports = {
  CALLBACK_PATH,
  DEFAULT_SCOPE,
  LocalTokenStore,
  ensureAccessToken,
  safeUrlForLogs,
  __testing: {
    computeExpiresAt,
    isTokenFresh,
    normalizeServerKey,
    deviceAuthorizationEndpointFromMetadata
  }
};
