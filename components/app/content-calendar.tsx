"use client";

import * as React from "react";
import { StatusBadge } from "@/components/app/status-badge";
import { TypeTag } from "@/components/app/platform-badges";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/api/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Month grid where each cell lists its posts with status badges. */
export function ContentCalendar({
  posts,
  month = new Date(2026, 5, 1),
  onPostClick,
}: {
  posts: Post[];
  month?: Date;
  onPostClick?: (post: Post) => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const byDay = React.useMemo(() => {
    const map = new Map<number, Post[]>();
    for (const p of posts) {
      if (!p.scheduledAt) continue;
      const d = new Date(p.scheduledAt);
      if (d.getFullYear() === year && d.getMonth() === m) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), p]);
      }
    }
    return map;
  }, [posts, year, m]);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dayPosts = day ? (byDay.get(day) ?? []) : [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-[104px] border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                !day && "bg-[color-mix(in_srgb,var(--muted)_25%,transparent)]",
              )}
            >
              {day && (
                <>
                  <div className="mb-1 px-1 text-xs font-semibold text-muted-foreground">
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayPosts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onPostClick?.(p)}
                        className="block w-full rounded-md border bg-card/60 p-1.5 text-left text-[11px] transition-colors hover:border-ring"
                      >
                        <div className="mb-1 flex items-center gap-1">
                          <TypeTag type={p.postType} />
                        </div>
                        <div className="truncate font-medium">
                          {p.caption || "Untitled post"}
                        </div>
                        <StatusBadge status={p.status} className="mt-1" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
