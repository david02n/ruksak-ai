"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { POSTHOG_PRODUCT } from "@/lib/posthog";

export function PostHogUser() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      posthog.reset();
      return;
    }

    posthog.identify(user.id, {
      product: POSTHOG_PRODUCT,
      email: user.primaryEmailAddress?.emailAddress ?? undefined,
      name: user.fullName ?? undefined
    });
  }, [user, isLoaded]);

  return null;
}
