"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type { TeamMember } from "@/lib/api/types";

/**
 * Presence indicator for a member's "today" attendance.
 *   'in'  → green dot + "In"   (checked in, not yet out)
 *   'out' → muted dot + "Out"  (checked in and out)
 *   null  → faint dot + "—"    (no record today)
 */
export function PresenceDot({
  presence,
  className,
  showLabel = false,
}: {
  presence: TeamMember["presence"];
  className?: string;
  showLabel?: boolean;
}) {
  const meta =
    presence === "in"
      ? { color: "var(--success)", label: "In", pulse: true }
      : presence === "out"
        ? { color: "var(--muted-foreground)", label: "Out", pulse: false }
        : { color: "color-mix(in srgb,var(--muted-foreground) 35%,transparent)", label: "—", pulse: false };

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex size-2">
        {meta.pulse && (
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: meta.color }}
          />
        )}
        <span
          className="relative inline-flex size-2 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
      </span>
      {showLabel && (
        <span
          className="text-xs font-semibold"
          style={{
            color:
              presence === "in"
                ? "var(--success)"
                : "var(--muted-foreground)",
          }}
        >
          {meta.label}
        </span>
      )}
    </span>
  );
}

/** A pill summarizing presence (used on member cards / header). */
export function PresenceBadge({ member }: { member: TeamMember }) {
  const inToday = member.presence === "in";
  const out = member.presence === "out";
  const label = inToday ? "In today" : out ? "Checked out" : "Not in";
  const title =
    member.checkInAt != null
      ? `Checked in ${formatRelativeTime(member.checkInAt)}`
      : "No attendance recorded today";
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        inToday
          ? "text-success bg-[color-mix(in_srgb,var(--success)_14%,transparent)]"
          : "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]",
      )}
    >
      <PresenceDot presence={member.presence} />
      {label}
    </span>
  );
}

/** "X of Y in today" summary banner. Pass the full (filtered or full) roster. */
export function PresenceSummary({
  members,
  className,
}: {
  members: TeamMember[];
  className?: string;
}) {
  const active = members.filter((m) => m.status === "active");
  const inCount = active.filter((m) => m.presence === "in").length;
  const total = active.length;
  const pct = total ? Math.round((inCount / total) * 100) : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-4 py-3",
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--success)_14%,transparent)]">
        <PresenceDot presence="in" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tabular-nums">
          {inCount} of {total} in today
        </p>
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? "No active members yet"
            : `${pct}% of the active team has checked in`}
        </p>
      </div>
      {total > 0 && (
        <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_18%,transparent)] sm:block">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: "var(--success)",
            }}
          />
        </div>
      )}
    </div>
  );
}
