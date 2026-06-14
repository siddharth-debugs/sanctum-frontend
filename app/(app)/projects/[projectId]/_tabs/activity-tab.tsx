"use client";

import * as React from "react";
import { Activity as ActivityIcon } from "lucide-react";
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  format,
} from "date-fns";

import {
  describeActivity,
  ACTIVITY_TONE_CLASS,
} from "@/lib/constants/activity-options";
import { useProjectActivity } from "@/hooks/use-project-insights";
import { cn } from "@/lib/utils";
import type { ProjectActivity } from "@/lib/api/types";
import { EmptyState, ListSkeleton } from "./shared";

/** A human day label for the sticky group header. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMM yyyy");
}

/** A YYYY-MM-DD key so entries bucket by calendar day. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "unknown" : format(d, "yyyy-MM-dd");
}

export function ActivityTab({ projectId }: { projectId: string }) {
  const { data: activity, isLoading } = useProjectActivity(projectId);

  const groups = React.useMemo(() => {
    const map = new Map<string, { label: string; items: ProjectActivity[] }>();
    for (const a of activity ?? []) {
      const key = dayKey(a.createdAt);
      if (!map.has(key)) map.set(key, { label: dayLabel(a.createdAt), items: [] });
      map.get(key)!.items.push(a);
    }
    return Array.from(map.values());
  }, [activity]);

  if (isLoading) return <ListSkeleton rows={6} />;

  if (!activity || activity.length === 0) {
    return (
      <EmptyState
        icon={<ActivityIcon className="size-5" />}
        title="No activity yet"
        description="Task moves, timers, milestones, and team changes will show up here as a running log."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label}>
          <div className="sticky top-0 z-10 -mx-1 mb-2 bg-[var(--glass-bg)] px-1 py-1.5 backdrop-blur-[var(--glass-blur)]">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {group.label}
            </h3>
          </div>
          <ul className="relative space-y-1 border-l pl-0.5">
            {group.items.map((a) => {
              const view = describeActivity(a);
              return (
                <li
                  key={a.id}
                  className="relative flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "-ml-[1.35rem] mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-background",
                      ACTIVITY_TONE_CLASS[view.tone],
                    )}
                  >
                    {view.icon}
                  </span>
                  <div className="min-w-0 flex-1 text-sm leading-snug">
                    <span className="font-medium">
                      {a.actorName ?? "Someone"}
                    </span>{" "}
                    <span className="text-muted-foreground">{view.summary}</span>
                  </div>
                  <time
                    dateTime={a.createdAt}
                    title={format(new Date(a.createdAt), "PPpp")}
                    className="shrink-0 text-xs tabular-nums text-muted-foreground"
                  >
                    {formatDistanceToNow(new Date(a.createdAt), {
                      addSuffix: true,
                    })}
                  </time>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
