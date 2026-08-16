"use client";

import * as React from "react";
import {
  CheckCircle2,
  CheckCheck,
  LayoutGrid,
  Smartphone,
  CalendarDays,
  Rows3,
  Loader2,
  Inbox,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { PortalFeedItem } from "@/components/app/portal-feed-item";
import { PortalCalendar } from "@/components/app/portal-calendar";
import { PortalComments } from "@/components/app/portal-comments";
import { PortalMediaLightbox } from "@/components/app/portal-media-lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/app/glass-card";
import { useClientCalendar, useClientMe } from "@/hooks/use-client-portal";
import { clientReviewApi } from "@/lib/api/client-review-adapter";
import { cn, initials } from "@/lib/utils";
import type { ClientPost, PortalPost } from "@/lib/api/types";
import type { PreviewBrand } from "@/components/app/portal-platform-preview";
import { ErrorState } from "../_components/portal-bits";

const VIEW_KEY = "sanctum.client.calendar.view"; // "preview" | "cards"

type ViewMode = "preview" | "cards";
type Tab = "feed" | "calendar";
type Filter = "all" | "review" | "approved" | "scheduled" | "posted";

const FILTERS: { key: Filter; label: string; match: (s: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  {
    key: "review",
    label: "To review",
    match: (s) => s === "pending_approval" || s === "changes_requested",
  },
  { key: "approved", label: "Approved", match: (s) => s === "approved" },
  { key: "scheduled", label: "Scheduled", match: (s) => s === "scheduled" },
  { key: "posted", label: "Posted", match: (s) => s === "posted" },
];

/**
 * The logged-in client's calendar shares the redacted `ClientPost` shape (plain
 * strings, no `position`); the portal review components want the strict
 * `PortalPost`. The runtime data lines up, so we adapt it at this boundary.
 */
function toPortalPost(p: ClientPost): PortalPost {
  return {
    id: p.id,
    postType: p.postType as PortalPost["postType"],
    caption: p.caption,
    platforms: p.platforms,
    scheduledAt: p.scheduledAt,
    status: p.status as PortalPost["status"],
    media: p.media.map((m, i) => ({
      resourceType: m.resourceType === "video" ? "video" : "image",
      secureUrl: m.secureUrl,
      width: m.width,
      height: m.height,
      position: i,
    })),
  };
}

/** Progress ring for the header stat. */
function ProgressRing({
  pct,
  brand,
  size = 72,
}: {
  pct: number;
  brand: string;
  size?: number;
}) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6" className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke={brand}
          strokeDasharray={`${dash} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">{pct}%</span>
    </div>
  );
}

/** Segmented control used for both view-mode and the feed/calendar tabs. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon: React.ElementType }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-secondary/50 p-1"
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ClientCalendarPage() {
  const calendar = useClientCalendar();
  const me = useClientMe();

  // ---- View mode (persisted) ----
  const [view, setView] = React.useState<ViewMode>("preview");
  React.useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "preview" || saved === "cards") setView(saved);
  }, []);
  const setViewPersist = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const [tab, setTab] = React.useState<Tab>("feed");
  const [filter, setFilter] = React.useState<Filter>("all");

  // ---- Comments panel ----
  const [commentsFor, setCommentsFor] = React.useState<PortalPost | null>(null);

  // ---- Calendar -> lightbox ----
  const [calMedia, setCalMedia] = React.useState<PortalPost["media"]>([]);
  const [calCaption, setCalCaption] = React.useState<string | null>(null);
  const [calOpen, setCalOpen] = React.useState(false);

  // ---- Bulk approve ----
  const [approving, setApproving] = React.useState(false);

  const canApprove = calendar.data?.canApprove ?? false;
  const canComment = true; // every logged-in client can join the discussion.
  const agencyName = me.data?.agency?.name ?? "the team";
  const clientName = me.data?.client?.name ?? "Your brand";
  const clientBrand = me.data?.agency?.brandColor || "var(--primary)";

  const posts = React.useMemo(
    () => (calendar.data?.posts ?? []).map(toPortalPost),
    [calendar.data?.posts],
  );

  const total = posts.length;
  const pendingPosts = posts.filter(
    (p) => p.status === "pending_approval" || p.status === "changes_requested",
  );
  const awaiting = pendingPosts.length;
  const done = posts.filter((p) =>
    ["approved", "scheduled", "posted"].includes(p.status),
  ).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const previewBrand: PreviewBrand = {
    clientName,
    logoUrl: null,
    brandColor: clientBrand,
    handles: null,
  };

  const filtered = React.useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    return posts.filter((p) => f.match(p.status));
  }, [posts, filter]);

  // Count per filter for the chips.
  const counts = React.useMemo(() => {
    const map: Record<Filter, number> = { all: 0, review: 0, approved: 0, scheduled: 0, posted: 0 };
    for (const f of FILTERS) map[f.key] = posts.filter((p) => f.match(p.status)).length;
    return map;
  }, [posts]);

  const approveAll = async () => {
    if (!pendingPosts.length || approving) return;
    setApproving(true);
    try {
      await Promise.all(
        pendingPosts.map((p) => clientReviewApi.decide(p.id, "approved")),
      );
      toast.success(
        `Approved ${pendingPosts.length} post${pendingPosts.length === 1 ? "" : "s"} — the team's been notified`,
      );
      await calendar.refetch();
    } catch {
      toast.error("Couldn't approve everything — please try again");
    } finally {
      setApproving(false);
    }
  };

  const isLoading = calendar.isLoading;

  return (
    <div
      className="space-y-6"
      style={{ ["--portal-brand" as string]: clientBrand }}
    >
      {/* ============ Intro / progress ============ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-bold text-white shadow-sm"
            style={{ background: clientBrand }}
          >
            {me.data ? initials(clientName) : "—"}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Content Calendar
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Sparkles className="size-3.5" />
              Review, approve, and discuss your posts
            </p>
          </div>
        </div>

        {!isLoading && total > 0 && (
          <GlassCard className="flex items-center gap-3 px-4 py-3">
            <ProgressRing pct={pct} brand={clientBrand} />
            <div className="min-w-0">
              <p className="text-sm font-semibold tabular-nums">
                {done} of {total} approved
              </p>
              <p className="mt-0.5 text-xs">
                {awaiting > 0 ? (
                  <span className="font-medium text-warning">
                    {awaiting} awaiting you
                  </span>
                ) : (
                  <span className="text-muted-foreground">All reviewed — thank you!</span>
                )}
              </p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ============ Body ============ */}
      {isLoading ? (
        <div className="mx-auto max-w-[480px] space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[34rem] rounded-2xl" />
          ))}
        </div>
      ) : calendar.isError ? (
        <ErrorState onRetry={() => calendar.refetch()} />
      ) : total === 0 ? (
        <div className="glass relative overflow-hidden rounded-2xl p-10 text-center sm:p-16">
          <span
            className="mx-auto grid size-16 place-items-center rounded-2xl text-success"
            style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}
          >
            <Inbox className="size-8" />
          </span>
          <p className="mt-4 font-display text-xl font-semibold">
            Nothing to review right now
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            You&apos;re all caught up. When {agencyName} has new content ready,
            it&apos;ll appear here for your approval.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-success" />
            Up to date
          </span>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const n = counts[f.key];
              if (f.key !== "all" && n === 0) return null;
              const active = filter === f.key && tab === "feed";
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setFilter(f.key);
                    setTab("feed");
                  }}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring/50",
                    active
                      ? "bg-[color-mix(in_srgb,var(--portal-brand)_14%,transparent)] text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {f.key === "review" && awaiting > 0 && (
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ background: "var(--warning)" }}
                      />
                    )}
                    {f.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                      active ? "bg-background/70" : "bg-secondary",
                    )}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Toolbar: tabs + view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented<Tab>
              ariaLabel="Switch view"
              value={tab}
              onChange={setTab}
              options={[
                { value: "feed", label: "Feed", icon: Rows3 },
                { value: "calendar", label: "Calendar", icon: CalendarDays },
              ]}
            />
            {tab === "feed" && (
              <Segmented<ViewMode>
                ariaLabel="Preview style"
                value={view}
                onChange={setViewPersist}
                options={[
                  { value: "preview", label: "Preview", icon: Smartphone },
                  { value: "cards", label: "Cards", icon: LayoutGrid },
                ]}
              />
            )}
          </div>

          {tab === "calendar" ? (
            <>
              <PortalCalendar
                posts={posts}
                onPostClick={(p) => {
                  if (p.media.length) {
                    setCalMedia(p.media);
                    setCalCaption(p.caption);
                    setCalOpen(true);
                  } else {
                    setCommentsFor(p);
                  }
                }}
              />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Tap any post to preview it. Switch to Feed to approve.
              </p>
            </>
          ) : (
            <>
              {/* Needs-review banner */}
              {awaiting > 0 && filter !== "review" && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_20%,transparent)] text-warning">
                    <Sparkles className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {awaiting} post{awaiting === 1 ? "" : "s"} need
                      {awaiting === 1 ? "s" : ""} your review
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Approve below, or jump straight to what needs you.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => setFilter("review")}
                  >
                    Review now <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
                  Nothing here yet.
                </div>
              ) : (
                <div className="mx-auto max-w-[480px] space-y-6">
                  {filter === "review" && awaiting > 1 && canApprove && (
                    <Button
                      className="h-11 w-full font-semibold shadow-sm"
                      disabled={approving}
                      onClick={approveAll}
                    >
                      {approving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCheck className="size-4" />
                      )}
                      Approve all {awaiting}
                    </Button>
                  )}
                  {filtered.map((post, idx) => (
                    <div
                      key={post.id}
                      className="portal-rise"
                      style={{ animationDelay: `${Math.min(idx, 6) * 55}ms` }}
                    >
                      <PortalFeedItem
                        api={clientReviewApi}
                        post={post}
                        view={view}
                        canApprove={canApprove}
                        canComment={canComment}
                        agencyName={agencyName}
                        brand={previewBrand}
                        onOpenComments={() => setCommentsFor(post)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Comments panel */}
      {commentsFor && (
        <PortalComments
          open={!!commentsFor}
          onOpenChange={(o) => !o && setCommentsFor(null)}
          api={clientReviewApi}
          postId={commentsFor.id}
          agencyName={agencyName}
          brand={clientBrand}
          canComment={canComment}
          captionPreview={commentsFor.caption}
        />
      )}

      {/* Calendar -> lightbox */}
      <PortalMediaLightbox
        open={calOpen}
        onOpenChange={setCalOpen}
        media={calMedia}
        caption={calCaption}
      />
    </div>
  );
}
