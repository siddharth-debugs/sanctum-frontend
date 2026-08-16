"use client";

import * as React from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/app/glass-card";
import { cn } from "@/lib/utils";

/**
 * Client-portal presentational helpers. Kept self-contained (the agency badge
 * components require strict union types, while the portal API types statuses as
 * plain strings) and resilient to unexpected server values.
 */

/** Prettify a snake/kebab status token — "on_hold" → "On hold". */
export function humanize(value: string): string {
  const s = value.replace(/[_-]+/g, " ").trim();
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

/** Token-driven color for a coarse status bucket, with a neutral fallback. */
function toneFor(value: string): string {
  const v = value.toLowerCase();
  if (["active", "in_progress", "approved", "on_track"].includes(v))
    return "text-primary bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]";
  if (["completed", "done", "posted"].includes(v))
    return "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]";
  if (["on_hold", "at_risk", "pending", "pending_approval"].includes(v))
    return "text-warning bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]";
  if (["cancelled", "off_track", "blocked", "changes_requested"].includes(v))
    return "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]";
  return "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)]";
}

export function StatusPill({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (!status) return null;
  return (
    <span className={cn(pill, toneFor(status), className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {humanize(status)}
    </span>
  );
}

/** Distinct label styling for relationship/project health (subset of statuses). */
export function HealthPill({
  health,
  className,
}: {
  health: string | null | undefined;
  className?: string;
}) {
  if (!health) return null;
  return (
    <span className={cn(pill, toneFor(health), className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {humanize(health)}
    </span>
  );
}

/** Circular progress indicator (SVG), brand-accent stroke. */
export function ProgressRing({
  pct,
  size = 72,
  stroke = 6,
  className,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  const r = size / 2 - stroke - 1;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <span className="absolute font-display text-sm font-bold tabular-nums">
        {clamped}%
      </span>
    </div>
  );
}

/** Empty-state card with an icon, title, optional hint and optional action. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassCard
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-display text-base font-semibold">{title}</p>
        {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action && <div className="mt-1 flex items-center gap-2">{action}</div>}
    </GlassCard>
  );
}

/** Inline error card with an optional retry. */
export function ErrorState({
  title = "Something went wrong",
  hint = "We couldn't load this right now. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <GlassCard
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-display text-base font-semibold">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Retry
        </Button>
      )}
    </GlassCard>
  );
}

/** Labelled progress bar row used across the portal. */
export function ProgressBar({
  pct,
  className,
}: {
  pct: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
