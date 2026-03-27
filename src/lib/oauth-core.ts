export function isLoopbackRedirectUri(uri: string) {
  try {
    const parsed = new URL(uri);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

export function resolveTokenEndpointAuthMethod(input: {
  requestedAuthMethod?: string;
  redirectUris?: string[];
}) {
  const requested = input.requestedAuthMethod;
  const redirectUris = input.redirectUris ?? [];
  const hasLoopbackRedirect =
    redirectUris.length > 0 && redirectUris.every((uri) => isLoopbackRedirectUri(uri));

  if (requested === "none" && hasLoopbackRedirect) {
    return "none";
  }

  return requested && requested !== "none" ? requested : "client_secret_post";
}
