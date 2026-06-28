"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ImageIcon } from "lucide-react";

import { StatusBadge } from "@/components/app/status-badge";
import { PlatformBadges, TypeTag } from "@/components/app/platform-badges";
import {
  ContentCalendarToolbar,
  STATUS_META,
  STATUS_ORDER,
  type CalendarFilters,
} from "@/components/app/content-calendar-toolbar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Post, PostStatus, PostType } from "@/lib/api/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const AGENDA_DAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** Local "YYYY-MM-DD" key (not UTC) so cells line up with the agency clock. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Re-target a post's scheduledAt to `day` while PRESERVING its original
 * time-of-day. Posts with no time fall back to 9:00 AM local.
 */
function moveToDay(scheduledAt: string | null, day: Date): string {
  const base = scheduledAt ? new Date(scheduledAt) : null;
  const next = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    base ? base.getHours() : 9,
    base ? base.getMinutes() : 0,
    0,
    0,
  );
  return next.toISOString();
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export function ContentCalendar({
  clientId,
  posts,
  onPostClick,
  onAddPost,
}: {
  clientId: string;
  posts: Post[];
  onPostClick?: (post: Post) => void;
  /** Opens the new-post form prefilled for `day` (9:00 AM local). */
  onAddPost?: (day: Date) => void;
}) {
  const qc = useQueryClient();

  // Displayed month — defaults to the month of the earliest scheduled post,
  // falling back to the seed month (June 2026).
  const initialMonth = React.useMemo(() => {
    const dates = posts
      .map((p) => p.scheduledAt)
      .filter((s): s is string => !!s)
      .map((s) => new Date(s))
      .sort((a, b) => a.getTime() - b.getTime());
    const earliest = dates[0] ?? new Date(2026, 5, 1);
    return new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    // Only seed once from the first non-empty posts payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length === 0]);

  const [month, setMonth] = React.useState(initialMonth);
  React.useEffect(() => setMonth(initialMonth), [initialMonth]);

  const [filters, setFilters] = React.useState<CalendarFilters>(() => ({
    statuses: new Set(STATUS_ORDER),
    types: new Set<PostType>(["reel", "story", "carousel", "post"]),
  }));

  const toggleStatus = (s: PostStatus) =>
    setFilters((f) => {
      const statuses = new Set(f.statuses);
      statuses.has(s) ? statuses.delete(s) : statuses.add(s);
      return { ...f, statuses };
    });
  const toggleType = (t: PostType) =>
    setFilters((f) => {
      const types = new Set(f.types);
      types.has(t) ? types.delete(t) : types.add(t);
      return { ...f, types };
    });

  const year = month.getFullYear();
  const m = month.getMonth();
  const today = React.useMemo(() => new Date(), []);

  // Posts scheduled within the displayed month (drives the summary strip).
  const monthPosts = React.useMemo(
    () =>
      posts.filter((p) => {
        if (!p.scheduledAt) return false;
        const d = new Date(p.scheduledAt);
        return d.getFullYear() === year && d.getMonth() === m;
      }),
    [posts, year, m],
  );

  const passesFilters = React.useCallback(
    (p: Post) => filters.statuses.has(p.status) && filters.types.has(p.postType),
    [filters],
  );

  // day-key -> filtered posts (sorted by time), for the whole displayed month.
  const byDay = React.useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of monthPosts) {
      if (!passesFilters(p)) continue;
      const key = dayKey(new Date(p.scheduledAt!));
      const list = map.get(key);
      if (list) list.push(p);
      else map.set(key, [p]);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.scheduledAt!).getTime() -
          new Date(b.scheduledAt!).getTime(),
      );
    }
    return map;
  }, [monthPosts, passesFilters]);

  /* ---- Drag-to-reschedule (optimistic over all cached list variants) ---- */
  const [activePost, setActivePost] = React.useState<Post | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Same endpoint as useUpdatePost(clientId, postId); the postId rides along in
  // the mutation variables since it isn't known until the drop lands.
  const reschedule = useMutation({
    mutationFn: (v: { postId: string; scheduledAt: string }) =>
      api<Post>(`/clients/${clientId}/posts/${v.postId}`, {
        method: "PATCH",
        body: { scheduledAt: v.scheduledAt },
      }),
    onSuccess: (_data, v) => {
      qc.invalidateQueries({ queryKey: ["clients", clientId, "posts"] });
      toast.success(`Rescheduled to ${AGENDA_DAY_FMT.format(new Date(v.scheduledAt))}`);
    },
  });

  const onDragStart = React.useCallback(
    (e: DragStartEvent) => {
      setActivePost(posts.find((p) => p.id === e.active.id) ?? null);
    },
    [posts],
  );

  const onDragEnd = React.useCallback(
    (e: DragEndEvent) => {
      setActivePost(null);
      const overId = e.over?.id;
      const postId = String(e.active.id);
      if (!overId) return;

      const targetKey = String(overId); // droppable id == day key
      const current = posts.find((p) => p.id === postId);
      if (!current) return;
      if (
        current.scheduledAt &&
        dayKey(new Date(current.scheduledAt)) === targetKey
      )
        return; // no-op drop on the same day

      const [ty, tm, td] = targetKey.split("-").map(Number);
      const targetDay = new Date(ty, tm - 1, td);
      const scheduledAt = moveToDay(current.scheduledAt, targetDay);

      // Optimistically patch every cached posts-LIST variant for this client.
      // ["clients", id, "posts"] is also the prefix for non-list caches, so we
      // only touch array-shaped entries.
      const snapshots = qc.getQueriesData<Post[]>({
        predicate: (q) => {
          const k = q.queryKey as unknown[];
          return k[0] === "clients" && k[1] === clientId && k[2] === "posts";
        },
      });
      for (const [key, list] of snapshots) {
        if (!Array.isArray(list)) continue;
        qc.setQueryData<Post[]>(
          key,
          list.map((p) => (p.id === postId ? { ...p, scheduledAt } : p)),
        );
      }

      reschedule.mutate(
        { postId, scheduledAt },
        {
          onError: (err) => {
            for (const [key, data] of snapshots) qc.setQueryData(key, data);
            toast.error(
              err instanceof ApiError ? err.message : "Couldn't reschedule post",
            );
          },
        },
      );
    },
    [posts, clientId, qc, reschedule],
  );

  // Leading blanks + day numbers for the month grid.
  const firstWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, m, i + 1)),
  ];

  return (
    <div className="space-y-4">
      <ContentCalendarToolbar
        month={month}
        monthPosts={monthPosts}
        filters={filters}
        onPrev={() => setMonth(new Date(year, m - 1, 1))}
        onNext={() => setMonth(new Date(year, m + 1, 1))}
        onToday={() =>
          setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
        }
        onToggleStatus={toggleStatus}
        onToggleType={toggleType}
      />

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Month grid — horizontal scroll on narrow viewports, agenda < sm. */}
        <div className="hidden sm:block">
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-7 border-b bg-muted/40">
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
              {cells.map((date, i) => (
                <DayCell
                  key={date ? dayKey(date) : `blank-${i}`}
                  date={date}
                  posts={date ? (byDay.get(dayKey(date)) ?? []) : []}
                  isToday={!!date && isSameDay(date, today)}
                  onPostClick={onPostClick}
                  onAddPost={onAddPost}
                />
              ))}
            </div>
          </div>
        </div>

        <AgendaList
          month={month}
          byDay={byDay}
          today={today}
          onPostClick={onPostClick}
          onAddPost={onAddPost}
        />

        <DragOverlay dropAnimation={null}>
          {activePost ? (
            <div className="w-44 rotate-2 motion-reduce:rotate-0">
              <PostCard post={activePost} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day cell                                                            */
/* ------------------------------------------------------------------ */

function DayCell({
  date,
  posts,
  isToday,
  onPostClick,
  onAddPost,
}: {
  date: Date | null;
  posts: Post[];
  isToday: boolean;
  onPostClick?: (post: Post) => void;
  onAddPost?: (day: Date) => void;
}) {
  const key = date ? dayKey(date) : "blank";
  const { setNodeRef, isOver } = useDroppable({ id: key, disabled: !date });
  const isWeekend = !!date && (date.getDay() === 0 || date.getDay() === 6);

  const visible = posts.slice(0, MAX_VISIBLE);
  const overflow = posts.slice(MAX_VISIBLE);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/cell relative flex min-h-[120px] flex-col gap-1 border-b border-r p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
        !date && "bg-muted/25",
        isWeekend && "bg-muted/15",
        isOver &&
          "bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] ring-1 ring-inset ring-primary/40",
      )}
    >
      {date && (
        <>
          <div className="flex items-center justify-between px-0.5">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
                isToday
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {date.getDate()}
            </span>
            {onAddPost && (
              <button
                type="button"
                onClick={() => onAddPost(date)}
                aria-label={`Add post on ${AGENDA_DAY_FMT.format(date)}`}
                className="grid size-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover/cell:opacity-100 motion-reduce:transition-none"
              >
                <Plus className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {visible.map((p) => (
              <DraggablePost key={p.id} post={p} onClick={onPostClick} />
            ))}

            {overflow.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    +{overflow.length} more
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 space-y-1.5 p-2">
                  <p className="px-1 pb-1 text-xs font-semibold text-muted-foreground">
                    {AGENDA_DAY_FMT.format(date)}
                  </p>
                  {posts.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      onClick={() => onPostClick?.(p)}
                    />
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post card (+ draggable wrapper)                                     */
/* ------------------------------------------------------------------ */

function DraggablePost({
  post,
  onClick,
}: {
  post: Post;
  onClick?: (post: Post) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    data: { post },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="touch-none focus-visible:outline-none"
    >
      <PostCard
        post={post}
        dragging={isDragging}
        onClick={() => onClick?.(post)}
      />
    </div>
  );
}

function PostCard({
  post,
  onClick,
  dragging,
  overlay,
}: {
  post: Post;
  onClick?: () => void;
  dragging?: boolean;
  overlay?: boolean;
}) {
  const thumb = post.media?.[0]?.secureUrl;
  const time = post.scheduledAt
    ? TIME_FMT.format(new Date(post.scheduledAt))
    : null;
  const meta = STATUS_META[post.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/card block w-full overflow-hidden rounded-lg border bg-card/70 text-left transition-[border-color,box-shadow,transform] hover:border-ring hover:shadow-sm motion-reduce:transition-none",
        dragging && "opacity-40",
        overlay && "cursor-grabbing border-ring bg-card shadow-lg",
      )}
    >
      {/* Status accent rail. */}
      <div className="flex">
        <span className={cn("w-1 shrink-0", meta.dot)} aria-hidden />
        <div className="min-w-0 flex-1 p-1.5">
          <div className="flex items-center gap-1">
            <span
              className={cn("size-1.5 shrink-0 rounded-full", meta.dot)}
              aria-hidden
            />
            {time && (
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                {time}
              </span>
            )}
            <span className="ml-auto">
              <PlatformBadges
                platforms={post.platforms.slice(0, 3)}
                className="[&>span]:size-[16px] [&>span]:rounded-[5px] [&>span]:text-[8px]"
              />
            </span>
          </div>

          <div className="mt-1 flex items-start gap-1.5">
            {thumb ? (
              <span
                className="mt-0.5 size-7 shrink-0 rounded-[6px] bg-cover bg-center ring-1 ring-border"
                style={{ backgroundImage: `url(${thumb})` }}
                aria-hidden
              />
            ) : (
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[6px] bg-secondary text-muted-foreground">
                <ImageIcon className="size-3.5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[11px] font-medium leading-snug">
                {post.caption || "Untitled post"}
              </span>
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-1">
            <TypeTag type={post.postType} />
            <span className="ml-auto text-[10px] font-medium text-muted-foreground">
              {meta.label}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Agenda list (mobile / < sm)                                         */
/* ------------------------------------------------------------------ */

function AgendaList({
  month,
  byDay,
  today,
  onPostClick,
  onAddPost,
}: {
  month: Date;
  byDay: Map<string, Post[]>;
  today: Date;
  onPostClick?: (post: Post) => void;
  onAddPost?: (day: Date) => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  // Only days that actually have posts (after filtering), in order.
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, m, i + 1)).filter(
    (d) => (byDay.get(dayKey(d)) ?? []).length > 0,
  );

  return (
    <div className="space-y-3 sm:hidden">
      {days.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          No posts match these filters this month.
        </p>
      ) : (
        days.map((d) => {
          const posts = byDay.get(dayKey(d)) ?? [];
          const isToday = isSameDay(d, today);
          return (
            <div key={dayKey(d)} className="rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isToday && "text-primary",
                  )}
                >
                  {AGENDA_DAY_FMT.format(d)}
                  {isToday && (
                    <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Today
                    </span>
                  )}
                </span>
                {onAddPost && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onAddPost(d)}
                    aria-label="Add post"
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {posts.map((p) => (
                  <AgendaRow key={p.id} post={p} onClick={() => onPostClick?.(p)} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function AgendaRow({ post, onClick }: { post: Post; onClick?: () => void }) {
  const thumb = post.media?.[0]?.secureUrl;
  const time = post.scheduledAt
    ? TIME_FMT.format(new Date(post.scheduledAt))
    : "—";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border bg-card/60 p-2 text-left transition-colors hover:border-ring"
    >
      {thumb ? (
        <span
          className="size-10 shrink-0 rounded-[8px] bg-cover bg-center ring-1 ring-border"
          style={{ backgroundImage: `url(${thumb})` }}
          aria-hidden
        />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-secondary text-muted-foreground">
          <ImageIcon className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {time}
          </span>
          <TypeTag type={post.postType} />
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm font-medium">
          {post.caption || "Untitled post"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={post.status} />
        <PlatformBadges platforms={post.platforms} />
      </div>
    </button>
  );
}
