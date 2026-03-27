"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { POSTHOG_PRODUCT } from "@/lib/posthog";

type PostHogUserProps = {
  distinctId?: string | null;
  email?: string | null;
  name?: string | null;
};

export function PostHogUser({ distinctId, email, name }: PostHogUserProps) {
  useEffect(() => {
    if (!distinctId) {
      posthog.reset();
      return;
    }

    posthog.identify(distinctId, {
      product: POSTHOG_PRODUCT,
      email: email ?? undefined,
      name: name ?? undefined
    });
  }, [distinctId, email, name]);

  return null;
}
