"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** A friendly, centered empty state used across every project tab. */
export function EmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="font-display text-sm font-semibold">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/** A small inline empty line for sub-sections (e.g. an empty status column). */
export function MiniEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground/70">
      {children}
    </p>
  );
}

/** Three stacked skeleton rows for a loading list. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-muted"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
