"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { POSTHOG_PRODUCT } from "@/lib/posthog";

type PostHogProviderProps = {
  children: React.ReactNode;
  apiKey?: string;
  apiHost?: string;
};

let initialized = false;

export function PostHogProvider({ children, apiKey, apiHost }: PostHogProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!apiKey || initialized) {
      return;
    }

    posthog.init(apiKey, {
      api_host: apiHost ?? "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: "identified_only"
    });
    initialized = true;
  }, [apiHost, apiKey]);

  useEffect(() => {
    if (!apiKey || !initialized) {
      return;
    }

    const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    posthog.capture("$pageview", {
      product: POSTHOG_PRODUCT,
      $current_url: query ? `${pathname}?${query}` : pathname
    });
  }, [apiKey, pathname]);

  if (!apiKey) {
    return children;
  }

  return <Provider client={posthog}>{children}</Provider>;
}
