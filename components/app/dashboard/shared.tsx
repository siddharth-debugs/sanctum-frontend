"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* SectionCard — a titled glass panel with built-in loading + empty     */
/* states, shared by every role dashboard so the surfaces read as one   */
/* system (mirrors ChartCard's frame, minus the chart-specific trend).  */
/* ------------------------------------------------------------------ */

export interface SectionCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Right-aligned header slot (a link, count pill, etc.). */
  action?: React.ReactNode;
  isLoading?: boolean;
  /** Number of shimmer rows to show while loading. */
  loadingRows?: number;
  /** When true (and not loading) the empty state renders instead of children. */
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyText?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  isLoading,
  loadingRows = 3,
  isEmpty,
  emptyIcon: EmptyIcon,
  emptyText,
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  return (
    <Card className={cn("glass gap-0 overflow-hidden border-0 py-0", className)}>
      <span aria-hidden className="glass-noise" />
      <div className="relative flex items-start gap-3 px-5 pt-5 pb-3">
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>
      <div className={cn("relative px-5 pb-5", bodyClassName)}>
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: loadingRows }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            {EmptyIcon && (
              <span className="grid size-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)] text-muted-foreground">
                <EmptyIcon className="size-5" />
              </span>
            )}
            <p className="max-w-[26ch] text-sm text-muted-foreground">
              {emptyText}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* BarBreakdown — labelled horizontal bars for a categorical count      */
/* distribution (tasks-by-status, project health, …). Token-driven.     */
/* ------------------------------------------------------------------ */

export interface BarDatum {
  key: string;
  name: string;
  value: number;
  /** CSS colour expression (Evergreen token or hex). */
  color: string;
}

export function BarBreakdown({
  data,
  footer,
}: {
  data: BarDatum[];
  footer?: React.ReactNode;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-sm"
                style={{ background: d.color }}
              />
              {d.name}
            </span>
            <b className="font-semibold tabular-nums">{d.value}</b>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: total ? `${(d.value / total) * 100}%` : "0%",
                background: d.color,
              }}
            />
          </div>
        </div>
      ))}
      {footer && (
        <p className="pt-1 text-xs text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}
