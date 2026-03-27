"use client";

import posthog from "posthog-js";

export const POSTHOG_PRODUCT = "ruksak";

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, {
    product: POSTHOG_PRODUCT,
    ...properties
  });
}
