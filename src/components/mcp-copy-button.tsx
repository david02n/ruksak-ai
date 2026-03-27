"use client";

import { useState } from "react";
import { captureEvent } from "@/lib/posthog";

type McpCopyButtonProps = {
  defaultLabel?: string;
  successLabel?: string;
  value: string;
};

export function McpCopyButton({
  defaultLabel = "Copy MCP link",
  successLabel = "Copied",
  value
}: McpCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      captureEvent("mcp_link_copied", {
        value
      });
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      captureEvent("mcp_link_copy_failed");
      setCopied(false);
    }
  }

  return (
    <button className="simple-copy-button" onClick={handleCopy} type="button">
      {copied ? successLabel : defaultLabel}
    </button>
  );
}
