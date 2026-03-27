const srcRootUrl = new URL("./", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      shortCircuit: true,
      url: new URL("./test-server-only-stub.mjs", import.meta.url).href
    };
  }

  if (specifier.startsWith("@/")) {
    return nextResolve(new URL(specifier.replace("@/", "./"), srcRootUrl).href, context);
  }

  return nextResolve(specifier, context);
}
