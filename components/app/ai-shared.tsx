"use client";

import * as React from "react";
import { Check, Copy, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PINE_BRASS_GRADIENT =
  "linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 75%,var(--primary)))";

/** Copy text to the clipboard with a toast + transient check state. */
export function useCopy(timeout = 1500) {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), timeout);
      } catch {
        toast.error("Couldn't copy to clipboard");
      }
    },
    [timeout],
  );
  return { copied, copy };
}

/** A compact copy button used on AI result surfaces. */
export function CopyButton({
  value,
  label = "Copy",
  className,
  size = "sm",
  variant = "outline",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "xs" | "sm";
  variant?: "outline" | "ghost";
}) {
  const { copied, copy } = useCopy();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => copy(value)}
      aria-label={label}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {label}
    </Button>
  );
}

/**
 * A subtle notice shown when an AI result came from the deterministic template
 * fallback (no GEMINI_API_KEY). Makes it clear the output is intentional, not
 * an error.
 */
export function FallbackNote({
  source,
  className,
}: {
  source: "gemini" | "fallback" | undefined;
  className?: string;
}) {
  if (source !== "fallback") return null;
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-1.5 rounded-lg border border-dashed bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] px-2.5 py-1.5 text-[11px] leading-snug text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-px size-3 shrink-0" aria-hidden />
      <span>
        Generated with built-in templates — set a Gemini API key on the server
        for live, on-brand AI output.
      </span>
    </p>
  );
}

/** Shared platform options for the content tools. */
export const PLATFORM_OPTIONS = [
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "X", value: "x" },
  { label: "YouTube", value: "youtube" },
  { label: "TikTok", value: "tiktok" },
] as const;

export const TONE_OPTIONS = [
  { label: "Professional", value: "professional" },
  { label: "Casual", value: "casual" },
  { label: "Playful", value: "playful" },
  { label: "Inspirational", value: "inspirational" },
  { label: "Bold", value: "bold" },
  { label: "Witty", value: "witty" },
  { label: "Educational", value: "educational" },
  { label: "Luxury", value: "luxury" },
] as const;
