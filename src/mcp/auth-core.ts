export const AUTH_REASON_CODES = {
  MISSING_BEARER: "AUTH_MISSING_BEARER",
  TOKEN_NOT_FOUND: "AUTH_TOKEN_NOT_FOUND",
  ISSUER_MISMATCH: "AUTH_ISSUER_MISMATCH",
  AUDIENCE_MISMATCH: "AUTH_AUDIENCE_MISMATCH",
  SCOPE_MISSING: "AUTH_SCOPE_MISSING",
  SUBJECT_MISSING: "AUTH_SUBJECT_MISSING",
  TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  TOKEN_NOT_YET_VALID: "AUTH_TOKEN_NOT_YET_VALID",
  USER_RESOLUTION_FAILED: "AUTH_USER_RESOLUTION_FAILED"
} as const;

export type AuthReasonCode =
  (typeof AUTH_REASON_CODES)[keyof typeof AUTH_REASON_CODES];

export type OAuthTokenShape = {
  clientId: string;
  clientName?: string | null;
  userId?: string | null;
  scope?: string | string[] | null;
  audience?: string | string[] | null;
  issuer?: string | null;
  subject?: string | null;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  notBefore?: Date | null;
  resource?: string | null;
};

export type AuthDiagnostic = {
  ok: boolean;
  reasonCode?: AuthReasonCode;
  issuer?: string | null;
  audience?: string | string[] | null;
  clientId?: string | null;
  subjectPresent: boolean;
  scopes: string[];
  resource?: string | null;
  expiresAt?: string | null;
  notBefore?: string | null;
  acceptedAudiences: string[];
};

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function normalizeResourceIdentifier(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.search = "";
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimTrailingSlash(value.trim());
  }
}

export function audienceValues(aud?: string | string[] | null) {
  if (!aud) {
    return [];
  }

  return (Array.isArray(aud) ? aud : [aud])
    .map((value) => normalizeResourceIdentifier(value))
    .filter((value): value is string => Boolean(value));
}

export function isAcceptedAudience(
  aud: string | string[] | null | undefined,
  acceptedAudiences: string[]
) {
  const normalizedAudiences = audienceValues(aud);

  if (!normalizedAudiences.length) {
    return false;
  }

  return normalizedAudiences.some((value) => acceptedAudiences.includes(value));
}

export function parseScopes(input?: string | string[] | null) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.map((value) => value.trim()).filter(Boolean);
  }

  return input
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function validateMcpOAuthTokenAgainstConfig(input: {
  token: OAuthTokenShape;
  acceptedAudiences: string[];
  expectedIssuer: string;
}) {
  const scopes = parseScopes(input.token.scope);
  const normalizedIssuer = normalizeResourceIdentifier(input.token.issuer);
  const normalizedResource = normalizeResourceIdentifier(input.token.resource);
  const expectedIssuer = normalizeResourceIdentifier(input.expectedIssuer);
  const now = Date.now();

  const diagnosticBase: Omit<AuthDiagnostic, "ok"> = {
    issuer: normalizedIssuer,
    audience: input.token.audience ?? null,
    clientId: input.token.clientId,
    subjectPresent: Boolean(input.token.subject),
    scopes,
    resource: normalizedResource,
    expiresAt: input.token.expiresAt ? input.token.expiresAt.toISOString() : null,
    notBefore: input.token.notBefore ? input.token.notBefore.toISOString() : null,
    acceptedAudiences: input.acceptedAudiences
  };

  if (!input.token.subject || !input.token.userId) {
    return {
      ok: false,
      reasonCode: AUTH_REASON_CODES.SUBJECT_MISSING,
      ...diagnosticBase
    } satisfies AuthDiagnostic;
  }

  if (!normalizedIssuer || normalizedIssuer !== expectedIssuer) {
    return {
      ok: false,
      reasonCode: AUTH_REASON_CODES.ISSUER_MISMATCH,
      ...diagnosticBase
    } satisfies AuthDiagnostic;
  }

  if (input.token.notBefore && input.token.notBefore.getTime() > now) {
    return {
      ok: false,
      reasonCode: AUTH_REASON_CODES.TOKEN_NOT_YET_VALID,
      ...diagnosticBase
    } satisfies AuthDiagnostic;
  }

  if (!input.token.expiresAt || input.token.expiresAt.getTime() <= now) {
    return {
      ok: false,
      reasonCode: AUTH_REASON_CODES.TOKEN_EXPIRED,
      ...diagnosticBase
    } satisfies AuthDiagnostic;
  }

  if (!isAcceptedAudience(input.token.audience, input.acceptedAudiences)) {
    return {
      ok: false,
      reasonCode: AUTH_REASON_CODES.AUDIENCE_MISMATCH,
      ...diagnosticBase
    } satisfies AuthDiagnostic;
  }

  if (!scopes.includes("mcp:tools")) {
    return {
      ok: false,
      reasonCode: AUTH_REASON_CODES.SCOPE_MISSING,
      ...diagnosticBase
    } satisfies AuthDiagnostic;
  }

  return {
    ok: true,
    ...diagnosticBase
  } satisfies AuthDiagnostic;
}
