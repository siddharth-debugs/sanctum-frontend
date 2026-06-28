"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageOff, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalPost } from "@/lib/api/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Status -> accent token. Always paired with a text label, never hue alone. */
const STATUS_DOT: Record<string, string> = {
  pending_approval: "var(--warning)",
  changes_requested: "var(--destructive)",
  approved: "var(--primary)",
  scheduled: "var(--accent)",
  posted: "var(--success)",
  draft: "var(--muted-foreground)",
};
const STATUS_SHORT: Record<string, string> = {
  pending_approval: "Review",
  changes_requested: "Changes",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  draft: "Draft",
};

function monthKey(d: Date) {
  return d.getFullYear() * 12 + d.getMonth();
}

/**
 * Read-only month calendar of the client's content with month navigation, a
 * today marker, weekend tint, status-colored entries + thumbnails. Collapses to
 * a tidy agenda list on mobile. Clicking a post bubbles up to open its detail.
 */
export function PortalCalendar({
  posts,
  onPostClick,
}: {
  posts: PortalPost[];
  onPostClick?: (post: PortalPost) => void;
}) {
  // Anchor on the earliest scheduled post's month; allow nav from there.
  const initial = React.useMemo(() => {
    const dated = posts
      .filter((p) => p.scheduledAt)
      .map((p) => new Date(p.scheduledAt as string))
      .sort((a, b) => a.getTime() - b.getTime());
    return dated[0] ?? new Date();
  }, [posts]);

  const [cursor, setCursor] = React.useState(
    () => new Date(initial.getFullYear(), initial.getMonth(), 1),
  );
  // Re-anchor if the data's month changes (e.g. first load resolves).
  React.useEffect(() => {
    setCursor(new Date(initial.getFullYear(), initial.getMonth(), 1));
  }, [initial]);

  const year = cursor.getFullYear();
  const m = cursor.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const today = new Date();
  const todayDate =
    today.getFullYear() === year && today.getMonth() === m ? today.getDate() : -1;

  const byDay = React.useMemo(() => {
    const map = new Map<number, PortalPost[]>();
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

  // Which months actually have content, for prev/next affordance.
  const monthsWithPosts = React.useMemo(() => {
    const s = new Set<number>();
    for (const p of posts) {
      if (p.scheduledAt) s.add(monthKey(new Date(p.scheduledAt)));
    }
    return s;
  }, [posts]);

  const presentStatuses = React.useMemo(() => {
    const s = new Set<string>();
    for (const list of byDay.values()) for (const p of list) s.add(p.status);
    return [...s];
  }, [byDay]);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  // Agenda (mobile): every dated post this month, in order.
  const agenda = React.useMemo(() => {
    const items: { day: number; post: PortalPost }[] = [];
    for (const [day, list] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      for (const post of list) items.push({ day, post });
    }
    return items;
  }, [byDay]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header: month nav + legend */}
      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-3 sm:px-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shift(-1)}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shift(1)}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <h3 className="font-display text-base font-semibold tabular-nums">
          {cursor.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h3>
        {presentStatuses.length > 0 && (
          <ul className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
            {presentStatuses.map((s) => (
              <li
                key={s}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: STATUS_DOT[s] ?? "var(--muted-foreground)" }}
                />
                {STATUS_SHORT[s] ?? s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- Desktop / tablet: month grid ---- */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 border-b bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]">
          {WEEKDAYS.map((d, idx) => (
            <div
              key={d}
              className={cn(
                "px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                (idx === 0 || idx === 6) && "text-muted-foreground/70",
              )}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayPosts = day ? byDay.get(day) ?? [] : [];
            const isToday = day === todayDate;
            const col = i % 7;
            const weekend = col === 0 || col === 6;
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[104px] border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                  !day && "bg-[color-mix(in_srgb,var(--muted)_20%,transparent)]",
                  day && weekend && "bg-[color-mix(in_srgb,var(--muted)_22%,transparent)]",
                  isToday && "bg-[color-mix(in_srgb,var(--portal-brand)_6%,transparent)]",
                )}
              >
                {day && (
                  <>
                    <div className="mb-1 flex items-center justify-between px-0.5">
                      <span
                        className={cn(
                          "grid size-5 place-items-center rounded-full text-xs font-semibold tabular-nums",
                          isToday
                            ? "text-white"
                            : "text-muted-foreground",
                        )}
                        style={isToday ? { background: "var(--portal-brand)" } : undefined}
                      >
                        {day}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayPosts.map((p) => (
                        <CalEntry key={p.id} post={p} onClick={() => onPostClick?.(p)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Mobile: agenda list ---- */}
      <div className="sm:hidden">
        {agenda.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground">
            <CalendarDays className="size-7 opacity-50" />
            <p className="text-sm">Nothing scheduled this month.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {agenda.map(({ day, post }) => {
              const accent = STATUS_DOT[post.status] ?? "var(--muted-foreground)";
              const thumb = post.media?.find((mm) => mm.resourceType === "image");
              const isToday = day === todayDate;
              return (
                <li key={post.id}>
                  <button
                    type="button"
                    onClick={() => onPostClick?.(post)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-secondary/50 focus-visible:bg-secondary/50"
                  >
                    <div className="flex w-11 shrink-0 flex-col items-center">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {WEEKDAYS[new Date(year, m, day).getDay()]}
                      </span>
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full text-sm font-bold tabular-nums",
                          isToday ? "text-white" : "text-foreground",
                        )}
                        style={isToday ? { background: "var(--portal-brand)" } : undefined}
                      >
                        {day}
                      </span>
                    </div>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb.secureUrl}
                        alt=""
                        loading="lazy"
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <ImageOff className="size-4 opacity-50" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                        style={{ color: accent }}
                      >
                        <span className="size-1.5 rounded-full" style={{ background: accent }} />
                        {STATUS_SHORT[post.status] ?? post.status}
                      </span>
                      <p className="line-clamp-1 text-sm text-foreground/85">
                        {post.caption || "Untitled"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function CalEntry({ post, onClick }: { post: PortalPost; onClick: () => void }) {
  const accent = STATUS_DOT[post.status] ?? "var(--muted-foreground)";
  const thumb = post.media?.find((mm) => mm.resourceType === "image");
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${STATUS_SHORT[post.status] ?? post.status} · ${post.caption ?? "Untitled"}`}
      className="flex w-full items-center gap-1.5 overflow-hidden rounded-lg border bg-background py-1 pl-1 pr-1.5 text-left text-[11px] leading-tight transition hover:border-[var(--portal-brand)]/50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/50"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb.secureUrl}
          alt=""
          loading="lazy"
          className="size-7 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
          <ImageOff className="size-3 opacity-50" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium" style={{ color: accent }}>
          {STATUS_SHORT[post.status] ?? post.status}
        </span>
        <span className="line-clamp-1 text-muted-foreground">
          {post.caption || "Untitled"}
        </span>
      </span>
    </button>
  );
}
