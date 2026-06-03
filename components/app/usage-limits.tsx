"use client";

import * as React from "react";
import {
  Sparkles,
  Users,
  UserCog,
  HardDrive,
  Gauge,
  Lock,
} from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsage } from "@/hooks/use-usage";
import { formatBytes, cn } from "@/lib/utils";
import type { RateLimitWindow } from "@/lib/api/types";

/** Safe percentage for a progress bar; guards null limits and divide-by-zero. */
function pct(used: number, limit: number | null): number {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

/** "used / limit" with null limit rendered as "Unlimited". */
function ratio(used: number, limit: number | null, fmt?: (n: number) => string) {
  const f = fmt ?? ((n: number) => String(n));
  return limit == null ? `${f(used)} / Unlimited` : `${f(used)} / ${f(limit)}`;
}

/** Turn a rate-limit window into "20 requests / min" style copy. */
function rateLabel(rl: RateLimitWindow): string {
  const ms = rl.windowMs;
  const min = ms / 60000;
  let unit: string;
  if (ms < 60000) unit = `${Math.round(ms / 1000)} sec`;
  else if (min === 1) unit = "min";
  else if (min === 60) unit = "hour";
  else if (min % 60 === 0) unit = `${min / 60} hours`;
  else unit = `${min} min`;
  const noun = rl.max === 1 ? "request" : "requests";
  return `${rl.max} ${noun} / ${unit}`;
}

/** Period like "2026-06" → "June 2026". */
function periodLabel(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function MeterRow({
  icon: Icon,
  label,
  value,
  percent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </span>
        <b className="font-semibold tabular-nums">{value}</b>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}

function UsageSkeleton() {
  return (
    <GlassCard className="p-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="mt-6 space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </GlassCard>
  );
}

/**
 * "AI usage & limits" — a token-driven glass card surfacing the agency's
 * current-period AI quota, resource counts, and HTTP rate limits. Owner/admin
 * only; renders a friendly note for everyone else (403).
 */
export function UsageLimits({ className }: { className?: string }) {
  const { data, isLoading, isError } = useUsage();

  if (isLoading) return <UsageSkeleton />;

  if (data?.forbidden) {
    return (
      <GlassCard className={cn("p-6", className)}>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
            <Lock className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">
              AI usage &amp; limits
            </h2>
            <p className="text-sm text-muted-foreground">
              Only owners and admins can view usage and rate limits.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (isError || !data?.usage) {
    return (
      <GlassCard className={cn("p-6", className)}>
        <h2 className="font-display text-lg font-semibold">
          AI usage &amp; limits
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Couldn&apos;t load usage right now. Please retry shortly.
        </p>
      </GlassCard>
    );
  }

  const u = data.usage;
  const aiPercent = pct(u.ai.used, u.ai.limit);
  const aiModel = u.ai.model;
  const providerLabel =
    u.ai.provider.toLowerCase() === "gemini"
      ? `Gemini · ${aiModel}`
      : `${u.ai.provider} · ${aiModel}`;

  return (
    <GlassCard className={cn("p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            AI usage &amp; limits
          </h2>
          <p className="text-sm text-muted-foreground">
            Your plan&apos;s monthly quota and the API rate limits that protect
            the workspace.
          </p>
        </div>
        {u.planName && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-xs font-semibold text-primary">
            {u.planName} plan
          </span>
        )}
      </div>

      {/* PRIMARY: AI generations this month. */}
      <div className="mt-5 rounded-xl border border-border bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            AI generations this month
          </span>
          <b className="font-display text-lg tabular-nums">
            {u.ai.limit == null
              ? `${u.ai.used} / Unlimited`
              : `${u.ai.used} / ${u.ai.limit}`}
          </b>
        </div>
        <Progress value={aiPercent} className="mt-3" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Resets monthly · {periodLabel(u.period)}</span>
          <span>{providerLabel}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A local fallback generator runs automatically if the AI API is
          unavailable, so generation never fails.
        </p>
      </div>

      {/* Resource meters. */}
      <div className="mt-5 space-y-4">
        <MeterRow
          icon={Users}
          label="Clients"
          value={ratio(u.clients.used, u.clients.limit)}
          percent={pct(u.clients.used, u.clients.limit)}
        />
        <MeterRow
          icon={UserCog}
          label="Team seats"
          value={ratio(u.team.used, u.team.limit)}
          percent={pct(u.team.used, u.team.limit)}
        />
        <MeterRow
          icon={HardDrive}
          label="Storage"
          value={ratio(u.storage.usedBytes, u.storage.limitBytes, formatBytes)}
          percent={pct(u.storage.usedBytes, u.storage.limitBytes)}
        />
      </div>

      {/* API rate limits. */}
      <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Gauge className="size-4 text-muted-foreground" />
          API rate limits
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["AI generation", u.rateLimits.ai],
              ["Authentication", u.rateLimits.auth],
              ["Global", u.rateLimits.global],
            ] as const
          ).map(([name, rl]) => (
            <div key={name} className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">{name}</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {rateLabel(rl)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </GlassCard>
  );
}
