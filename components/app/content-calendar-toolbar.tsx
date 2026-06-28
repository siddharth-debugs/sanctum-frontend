"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Post, PostStatus, PostType } from "@/lib/api/types";

/** Status filter order + labels (mirrors the page facets). */
export const STATUS_ORDER: PostStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "changes_requested",
  "scheduled",
  "posted",
];

export const STATUS_META: Record<
  PostStatus,
  { label: string; dot: string; chip: string }
> = {
  draft: {
    label: "Draft",
    dot: "bg-muted-foreground",
    chip: "data-[on=true]:bg-[color-mix(in_srgb,var(--muted-foreground)_16%,transparent)] data-[on=true]:text-foreground",
  },
  pending_approval: {
    label: "Pending",
    dot: "bg-warning",
    chip: "data-[on=true]:bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] data-[on=true]:text-warning",
  },
  approved: {
    label: "Approved",
    dot: "bg-primary",
    chip: "data-[on=true]:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] data-[on=true]:text-primary",
  },
  changes_requested: {
    label: "Changes",
    dot: "bg-destructive",
    chip: "data-[on=true]:bg-[color-mix(in_srgb,var(--destructive)_16%,transparent)] data-[on=true]:text-destructive",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-accent",
    chip: "data-[on=true]:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] data-[on=true]:text-accent",
  },
  posted: {
    label: "Posted",
    dot: "bg-success",
    chip: "data-[on=true]:bg-[color-mix(in_srgb,var(--success)_18%,transparent)] data-[on=true]:text-success",
  },
};

const TYPE_ORDER: PostType[] = ["reel", "story", "carousel", "post"];
const TYPE_LABEL: Record<PostType, string> = {
  reel: "Reel",
  story: "Story",
  carousel: "Carousel",
  post: "Post",
};

const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export interface CalendarFilters {
  statuses: Set<PostStatus>;
  types: Set<PostType>;
}

function FilterChip({
  on,
  onClick,
  className,
  children,
}: {
  on: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-on={on}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        "text-muted-foreground hover:text-foreground data-[on=true]:border-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Calendar header: ‹ Today › month navigation, a live month summary strip, and
 * quick status/type filter chips. Filter state is owned by the parent so the
 * grid and the toolbar stay in sync.
 */
export function ContentCalendarToolbar({
  month,
  monthPosts,
  filters,
  onPrev,
  onNext,
  onToday,
  onToggleStatus,
  onToggleType,
}: {
  month: Date;
  /** Posts already scoped to the displayed month (pre-filter). */
  monthPosts: Post[];
  filters: CalendarFilters;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleStatus: (s: PostStatus) => void;
  onToggleType: (t: PostType) => void;
}) {
  const counts = React.useMemo(() => {
    const c = new Map<PostStatus, number>();
    for (const p of monthPosts) c.set(p.status, (c.get(p.status) ?? 0) + 1);
    return c;
  }, [monthPosts]);

  // Summary strip: only the statuses present this month, in canonical order.
  const summary = STATUS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).map(
    (s) => ({ status: s, n: counts.get(s)! }),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={onToday} className="px-3">
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold tracking-tight tabular-nums">
          {MONTH_FMT.format(month)}
        </h2>

        {summary.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {summary.map(({ status, n }, i) => (
              <React.Fragment key={status}>
                {i > 0 && <span className="text-border">·</span>}
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      STATUS_META[status].dot,
                    )}
                  />
                  <span className="font-medium text-foreground">{n}</span>
                  {STATUS_META[status].label.toLowerCase()}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_ORDER.map((s) => (
          <FilterChip
            key={s}
            on={filters.statuses.has(s)}
            onClick={() => onToggleStatus(s)}
            className={STATUS_META[s].chip}
          >
            <span className={cn("size-1.5 rounded-full", STATUS_META[s].dot)} />
            {STATUS_META[s].label}
          </FilterChip>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {TYPE_ORDER.map((t) => (
          <FilterChip
            key={t}
            on={filters.types.has(t)}
            onClick={() => onToggleType(t)}
            className="data-[on=true]:border-transparent data-[on=true]:bg-secondary data-[on=true]:text-secondary-foreground"
          >
            {TYPE_LABEL[t]}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
