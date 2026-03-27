"use client";

import { useEffect } from "react";
import { captureEvent } from "@/lib/posthog";

type PostHogPageEventProps = {
  event: string;
  properties?: Record<string, unknown>;
};

export function PostHogPageEvent({ event, properties }: PostHogPageEventProps) {
  const serialized = JSON.stringify(properties ?? {});

  useEffect(() => {
    captureEvent(event, properties);
  }, [event, serialized]);

  return null;
}
