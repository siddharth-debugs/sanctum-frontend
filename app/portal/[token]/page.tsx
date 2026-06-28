"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CheckCheck,
  LayoutGrid,
  Smartphone,
  CalendarDays,
  Rows3,
  Loader2,
  User,
  ShieldCheck,
  Link2Off,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { portalApi } from "@/lib/api/portal-client";
import { queryKeys } from "@/lib/api/query-keys";
import { ApiError } from "@/lib/api/client";
import { usePortalSocket } from "@/hooks/use-portal-socket";
import { initials, cn } from "@/lib/utils";
import { handleFor } from "@/lib/portal-handles";
import type { PortalPost } from "@/lib/api/types";
import type { PreviewBrand } from "@/components/app/portal-platform-preview";

const REVIEWER_KEY = "sanctum.portal.reviewer";
const VIEW_KEY = "sanctum.portal.view"; // "preview" | "cards"

type ViewMode = "preview" | "cards";
type Tab = "feed" | "calendar";
type Filter = "all" | "review" | "approved" | "scheduled" | "posted";

const FILTERS: { key: Filter; label: string; match: (s: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  {
    key: "review",
    label: "Needs review",
    match: (s) => s === "pending_approval" || s === "changes_requested",
  },
  { key: "approved", label: "Approved", match: (s) => s === "approved" },
  { key: "scheduled", label: "Scheduled", match: (s) => s === "scheduled" },
  { key: "posted", label: "Posted", match: (s) => s === "posted" },
];

/** Progress ring for the rail stat. */
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

export default function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = React.use(params);

  // ---- Reviewer identity (persisted) ----
  const [reviewer, setReviewer] = React.useState("");
  React.useEffect(() => {
    const saved = localStorage.getItem(REVIEWER_KEY);
    if (saved) setReviewer(saved);
  }, []);
  const onReviewerChange = (v: string) => {
    setReviewer(v);
    try {
      localStorage.setItem(REVIEWER_KEY, v);
    } catch {
      /* ignore */
    }
  };
  const actorLabel = reviewer.trim() || "Client";

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

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.portal(token),
    queryFn: () => portalApi.resolve(token),
    retry: false,
  });

  const qc = useQueryClient();
  usePortalSocket(token, () => qc.invalidateQueries({ queryKey: ["portal"] }));

  // ---- Comments panel ----
  const [commentsFor, setCommentsFor] = React.useState<PortalPost | null>(null);

  // ---- Calendar -> lightbox ----
  const [calMedia, setCalMedia] = React.useState<PortalPost["media"]>([]);
  const [calCaption, setCalCaption] = React.useState<string | null>(null);
  const [calOpen, setCalOpen] = React.useState(false);

  const [agencyLogoBroken, setAgencyLogoBroken] = React.useState(false);
  const [clientLogoBroken, setClientLogoBroken] = React.useState(false);

  // ---- Bulk approve ----
  const [approving, setApproving] = React.useState(false);

  const agencyBrand = data?.agency?.brandColor || "var(--primary)";
  const clientBrand = data?.client.brandColor || agencyBrand;
  const posts = data?.posts ?? [];
  const total = posts.length;
  const pendingPosts = posts.filter(
    (p) => p.status === "pending_approval" || p.status === "changes_requested",
  );
  const awaiting = pendingPosts.length;
  const done = posts.filter((p) =>
    ["approved", "scheduled", "posted"].includes(p.status),
  ).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const handles = data?.client.handles ?? null;

  const previewBrand: PreviewBrand = {
    clientName: data?.client.name ?? "Client",
    logoUrl: data?.client.logoUrl,
    brandColor: clientBrand,
    handles,
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
        pendingPosts.map((p) =>
          portalApi.decide(token, p.id, "approved", undefined, actorLabel),
        ),
      );
      toast.success(
        `Approved ${pendingPosts.length} post${pendingPosts.length === 1 ? "" : "s"} — the team's been notified`,
      );
      await qc.invalidateQueries({ queryKey: ["portal"] });
    } catch {
      toast.error("Couldn't approve everything — please try again");
    } finally {
      setApproving(false);
    }
  };

  const social = handles
    ? Object.entries(handles).filter(([k]) => k !== "sector")
    : [];

  // ---- Invalid / expired link ----
  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 410 || error.status === 401)
  ) {
    return (
      <div className="portal-root flex min-h-dvh items-center justify-center p-4">
        <div className="glass-strong relative max-w-md overflow-hidden rounded-2xl p-8 text-center sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive">
            <Link2Off className="size-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">
            This link isn&apos;t active
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            It may have expired or been revoked for your security. Reach out to
            your agency and they&apos;ll send a fresh review link your way.
          </p>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Powered by Sanctum
          </p>
        </div>
      </div>
    );
  }

  // ---- Rail content (shared between desktop sticky rail + mobile header) ----
  const railProgress =
    !isLoading && data && total > 0 ? (
      <div className="flex items-center gap-3">
        <ProgressRing pct={pct} brand={clientBrand} />
        <div className="min-w-0">
          <p className="text-sm font-semibold tabular-nums">
            {done} of {total} approved
          </p>
          <p className="mt-0.5 text-xs">
            {awaiting > 0 ? (
              <span className="font-medium text-warning">{awaiting} awaiting you</span>
            ) : (
              <span className="text-muted-foreground">All reviewed — thank you!</span>
            )}
          </p>
        </div>
      </div>
    ) : null;

  return (
    <div
      className="portal-root min-h-dvh"
      style={{ ["--portal-brand" as string]: clientBrand }}
    >
      {/* ============ Agency identity bar ============ */}
      <div
        className="relative flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6"
        style={{
          background: `linear-gradient(100deg, color-mix(in srgb, ${agencyBrand} 90%, black 6%), color-mix(in srgb, ${agencyBrand} 60%, transparent))`,
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {data?.agency?.logoUrl && !agencyLogoBroken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.agency.logoUrl}
              alt={data.agency.name}
              onError={() => setAgencyLogoBroken(true)}
              className="h-6 max-w-[160px] object-contain drop-shadow-sm sm:h-7"
            />
          ) : (
            <span className="truncate text-sm font-semibold text-white drop-shadow-sm">
              {isLoading ? (
                <Skeleton className="h-4 w-28 bg-white/30" />
              ) : (
                data?.agency?.name ?? "Your agency"
              )}
            </span>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Sparkles className="size-3" />
          Content review
        </span>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:py-8">
        {/* ============ Left rail (desktop) / header (mobile) ============ */}
        <aside className="lg:sticky lg:top-6 lg:h-fit lg:self-start">
          <div className="glass-strong relative overflow-hidden rounded-2xl p-4 sm:p-5">
            {/* Client identity */}
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Skeleton className="size-14 rounded-2xl" />
              ) : data?.client.logoUrl && !clientLogoBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.client.logoUrl}
                  alt={data.client.name}
                  onError={() => setClientLogoBroken(true)}
                  className="size-14 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-border"
                />
              ) : (
                <span
                  className="grid size-14 shrink-0 place-items-center rounded-2xl text-xl font-bold text-white shadow-sm"
                  style={{ background: clientBrand }}
                >
                  {data ? initials(data.client.name) : "—"}
                </span>
              )}
              <div className="min-w-0">
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="mt-2 h-3.5 w-24" />
                  </>
                ) : (
                  <>
                    <h1 className="truncate font-display text-lg font-semibold tracking-tight">
                      {data?.client.name}
                    </h1>
                    {social.length > 0 ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        @{handleFor(social[0][0], handles, data?.client.name ?? "")}
                      </p>
                    ) : (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Content review
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Progress */}
            {railProgress && (
              <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-3">
                {railProgress}
              </div>
            )}

            {/* Filters (only on feed tab) */}
            {!isLoading && data && total > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 lg:flex-col lg:flex-nowrap lg:gap-1">
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
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring/50 lg:w-full lg:justify-between",
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
            )}

            {/* Reviewer name */}
            {!isLoading && data && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <label className="relative block">
                  <User className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={reviewer}
                    onChange={(e) => onReviewerChange(e.target.value)}
                    placeholder="Reviewing as… (your name)"
                    aria-label="Your name"
                    className="h-10 w-full pl-8 text-sm"
                  />
                </label>
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" />
                  Read-only — your approvals are securely recorded and sent to{" "}
                  {data.agency?.name ?? "the team"}.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* ============ Main column ============ */}
        <main className="min-w-0">
          {/* Toolbar: tabs + view toggle */}
          {!isLoading && data && total > 0 && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
          )}

          {/* Loading */}
          {isLoading ? (
            <div className="mx-auto max-w-[480px] space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[34rem] rounded-2xl" />
              ))}
            </div>
          ) : !data || total === 0 ? (
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
                You&apos;re all caught up. When {data?.agency?.name ?? "your agency"}{" "}
                has new content ready, it&apos;ll appear here for your approval.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-success" />
                Up to date
              </span>
            </div>
          ) : tab === "calendar" ? (
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
                <div
                  className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4"
                >
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
                  {filter === "review" && awaiting > 1 && (
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
                        token={token}
                        post={post}
                        view={view}
                        actorLabel={actorLabel}
                        canApprove={data.portal.canApprove}
                        canComment={data.portal.canComment}
                        agencyName={data.agency?.name ?? "the team"}
                        brand={previewBrand}
                        onOpenComments={() => setCommentsFor(post)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <footer className="mt-12 flex flex-col items-center gap-1 pb-24 text-center text-xs text-muted-foreground lg:pb-6">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-success" />
              Secure, read-only review link
            </span>
            <span>
              Powered by <span className="font-semibold text-foreground/70">Sanctum</span>
            </span>
          </footer>
        </main>
      </div>

      {/* Sticky mobile approve bar */}
      {!isLoading && data && awaiting > 0 && data.portal.canApprove && tab === "feed" && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 px-4 py-3 backdrop-blur-md lg:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <Button
            size="lg"
            className="h-12 w-full text-sm font-semibold shadow-sm"
            disabled={approving}
            onClick={approveAll}
          >
            {approving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            Approve all {awaiting} awaiting you
          </Button>
        </div>
      )}

      {/* Comments panel */}
      {data && commentsFor && (
        <PortalComments
          open={!!commentsFor}
          onOpenChange={(o) => !o && setCommentsFor(null)}
          token={token}
          postId={commentsFor.id}
          actorLabel={actorLabel}
          agencyName={data.agency?.name ?? "the team"}
          brand={clientBrand}
          canComment={data.portal.canComment}
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
