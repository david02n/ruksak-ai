import "server-only";

import { baseUrl, mcpAudience } from "@/lib/oauth";
import {
  AUTH_REASON_CODES,
  type AuthDiagnostic,
  type AuthReasonCode,
  type OAuthTokenShape,
  audienceValues,
  isAcceptedAudience,
  normalizeResourceIdentifier,
  parseScopes,
  validateMcpOAuthTokenAgainstConfig
} from "@/mcp/auth-core";

export {
  AUTH_REASON_CODES,
  audienceValues,
  isAcceptedAudience,
  normalizeResourceIdentifier,
  parseScopes
};

export type { AuthDiagnostic, AuthReasonCode, OAuthTokenShape };

export function acceptedAudienceForms() {
  const canonicalResource = normalizeResourceIdentifier(mcpAudience());
  const canonicalBase = normalizeResourceIdentifier(baseUrl());

  return Array.from(
    new Set([canonicalResource, canonicalBase].filter((value): value is string => Boolean(value)))
  );
}

export function validateMcpOAuthToken(token: OAuthTokenShape): AuthDiagnostic {
  return validateMcpOAuthTokenAgainstConfig({
    token,
    acceptedAudiences: acceptedAudienceForms(),
    expectedIssuer: baseUrl()
  });
}
