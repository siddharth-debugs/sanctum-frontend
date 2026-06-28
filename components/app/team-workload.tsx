"use client";

import * as React from "react";
import { ListTodo, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtHours } from "@/lib/constants/team-options";
import { utilizationColor } from "@/components/app/team-bits";
import type { TeamMember } from "@/lib/api/types";

/**
 * Compact workload chips: active task count + hours logged this week. Tabular
 * figures so counts line up across cards.
 */
export function WorkloadChips({
  member,
  className,
}: {
  member: TeamMember;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span
        className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2 py-0.5 text-xs font-medium text-foreground"
        title={`${member.activeTaskCount} active task${member.activeTaskCount === 1 ? "" : "s"}`}
      >
        <ListTodo className="size-3 text-primary" />
        <span className="tabular-nums">{member.activeTaskCount}</span>
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2 py-0.5 text-xs font-medium text-foreground"
        title={`${fmtHours(member.loggedMinutesThisWeek)} logged this week`}
      >
        <Clock className="size-3 text-accent" />
        <span className="tabular-nums">{fmtHours(member.loggedMinutesThisWeek)}</span>
      </span>
    </div>
  );
}

/**
 * A capacity bar that shows hours logged against weekly capacity. The fill is
 * tinted by load (normal / busy / over) and clamps the visual at 100% while the
 * label can read >100%.
 */
export function WorkloadBar({
  member,
  className,
}: {
  member: TeamMember;
  className?: string;
}) {
  const pct = Math.round(member.utilizationPct ?? 0);
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Capacity</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_18%,transparent)]"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Weekly capacity used"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, backgroundColor: utilizationColor(pct) }}
        />
      </div>
    </div>
  );
}
