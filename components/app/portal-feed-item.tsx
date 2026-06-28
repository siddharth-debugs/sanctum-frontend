"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  PencilLine,
  Loader2,
  MessageCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/app/status-badge";
import { PlatformBadges, TypeTag } from "@/components/app/platform-badges";
import {
  PortalPlatformPreview,
  type PreviewBrand,
} from "@/components/app/portal-platform-preview";
import { PortalMediaLightbox } from "@/components/app/portal-media-lightbox";
import { useThreadCount } from "@/components/app/portal-comments";
import { cn, formatDateTime } from "@/lib/utils";
import { PLATFORM_NAME, normalizePlatform } from "@/lib/portal-handles";
import { portalApi } from "@/lib/api/portal-client";
import { ApiError } from "@/lib/api/client";
import type { PortalPost } from "@/lib/api/types";

type Decision = "approved" | "changes_requested";
type ViewMode = "preview" | "cards";

const LOCKED = new Set(["approved", "scheduled", "posted"]);

function lockedCopy(status: PortalPost["status"], fresh: boolean) {
  if (status === "posted")
    return { icon: Radio, text: "Published — live on your channels", tone: "success" as const };
  if (status === "scheduled")
    return { icon: Clock, text: "Approved & scheduled to publish", tone: "accent" as const };
  return {
    icon: CheckCircle2,
    text: fresh ? "Approved — thank you!" : "You approved this",
    tone: "success" as const,
  };
}

/**
 * One post in the feed. Renders the platform preview (with a switcher when the
 * post targets several platforms) or a clean Sanctum card, then a docked action
 * tray — visually separate from the social chrome — carrying Approve / Request
 * changes / Discuss. All backend calls (decision, comment, live refetch) are
 * preserved; only locked statuses hide the action buttons.
 */
export function PortalFeedItem({
  token,
  post,
  view,
  actorLabel,
  canApprove,
  canComment,
  agencyName,
  brand,
  onOpenComments,
}: {
  token: string;
  post: PortalPost;
  view: ViewMode;
  actorLabel: string;
  canApprove: boolean;
  canComment: boolean;
  agencyName: string;
  brand: PreviewBrand;
  onOpenComments: () => void;
}) {
  const [status, setStatus] = React.useState(post.status);
  React.useEffect(() => setStatus(post.status), [post.status]);

  const [busy, setBusy] = React.useState<Decision | null>(null);
  const [justApproved, setJustApproved] = React.useState(false);
  const [showChanges, setShowChanges] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [lightbox, setLightbox] = React.useState(false);
  const [lightboxStart, setLightboxStart] = React.useState(0);

  const qc = useQueryClient();
  const commentCount = useThreadCount(token, post.id, canComment);

  // Platform switcher: which preview chrome is showing.
  const platforms = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const p of post.platforms) {
      const k = normalizePlatform(p);
      if (!seen.has(k)) {
        seen.add(k);
        list.push(k);
      }
    }
    return list.length ? list : ["instagram"];
  }, [post.platforms]);
  const [activePlatform, setActivePlatform] = React.useState(platforms[0]);
  React.useEffect(() => {
    if (!platforms.includes(activePlatform)) setActivePlatform(platforms[0]);
  }, [platforms, activePlatform]);

  const locked = LOCKED.has(status);
  const needsReview = status === "pending_approval" || status === "changes_requested";
  const showActions = canApprove && needsReview;

  const decide = async (d: Decision) => {
    setBusy(d);
    try {
      await portalApi.decide(token, post.id, d, d === "changes_requested" ? note.trim() || undefined : undefined, actorLabel);
      setStatus(d === "approved" ? "approved" : "changes_requested");
      if (d === "approved") {
        setJustApproved(true);
        toast.success("Approved — the team has been notified");
      } else {
        toast.success("Changes requested — the team will revise it");
        setShowChanges(false);
        setNote("");
      }
      await qc.invalidateQueries({ queryKey: ["portal"] });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't submit your decision",
      );
    } finally {
      setBusy(null);
    }
  };

  const openMedia = (index: number) => {
    setLightboxStart(index);
    setLightbox(true);
  };

  return (
    <article
      className={cn(
        "portal-feed-item overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition",
        justApproved && "ring-2 ring-[color-mix(in_srgb,var(--success)_55%,transparent)]",
      )}
    >
      {/* Platform switcher (only when multiple platforms, preview mode) */}
      {view === "preview" && platforms.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-secondary/40 px-2 py-1.5">
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActivePlatform(p)}
              aria-pressed={p === activePlatform}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-ring/50",
                p === activePlatform
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PLATFORM_NAME[p] ?? p}
            </button>
          ))}
        </div>
      )}

      {/* Body: preview chrome OR Sanctum card */}
      {view === "preview" ? (
        <PortalPlatformPreview
          post={post}
          platform={activePlatform}
          brand={brand}
          onOpenMedia={openMedia}
        />
      ) : (
        <SanctumCard post={post} status={status} brand={brand} onOpenMedia={openMedia} />
      )}

      {/* ---- Sanctum action tray (always outside the social chrome) ---- */}
      <div className="border-t border-border/60 bg-secondary/30 p-3">
        <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          <span className="tabular-nums">
            {post.scheduledAt ? formatDateTime(post.scheduledAt) : "Unscheduled"}
          </span>
          {view === "preview" && (
            <>
              <span aria-hidden>·</span>
              <span className="capitalize">{post.postType}</span>
            </>
          )}
          <StatusBadge status={status} className="ml-auto" />
        </div>

        {locked ? (
          <LockedRow status={status} fresh={justApproved} />
        ) : showActions ? (
          <>
            {status === "changes_requested" && !showChanges && (
              <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] px-2.5 py-1.5 text-xs font-medium text-destructive">
                <PencilLine className="size-3.5 shrink-0" />
                You requested changes — re-approve once it&apos;s updated.
              </p>
            )}

            {showChanges ? (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What should the team change? (optional)"
                  aria-label="Describe the changes you want"
                  className="resize-none rounded-xl text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 flex-1"
                    onClick={() => {
                      setShowChanges(false);
                      setNote("");
                    }}
                  >
                    <X className="size-4" /> Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={busy !== null}
                    onClick={() => decide("changes_requested")}
                  >
                    {busy === "changes_requested" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send request
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 flex-[1.4] text-sm font-bold shadow-sm"
                  disabled={busy !== null}
                  onClick={() => decide("approved")}
                >
                  {busy === "approved" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Check className="size-5" strokeWidth={2.75} />
                  )}
                  Approve
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-12 flex-1 text-sm"
                  disabled={busy !== null}
                  onClick={() => setShowChanges(true)}
                >
                  <PencilLine className="size-4" />
                  <span className="truncate">Request changes</span>
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" />
            Awaiting the team&apos;s review
          </div>
        )}

        {/* Discuss */}
        {canComment && (
          <button
            type="button"
            onClick={onOpenComments}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MessageCircle className="size-4" />
            {commentCount > 0 ? (
              <>
                Discussion
                <span className="rounded-full bg-[var(--portal-brand)] px-1.5 py-px text-[11px] font-bold tabular-nums text-white">
                  {commentCount}
                </span>
              </>
            ) : (
              "Comment or ask a question"
            )}
          </button>
        )}
      </div>

      {/* One-shot approval celebration overlay */}
      {justApproved && (
        <span aria-hidden className="pointer-events-none fixed inset-0 z-[60] grid place-items-center">
          <span className="portal-pop grid size-20 place-items-center rounded-full bg-success text-success-foreground shadow-2xl">
            <Check className="size-10" strokeWidth={3} />
          </span>
        </span>
      )}

      <PortalMediaLightbox
        open={lightbox}
        onOpenChange={setLightbox}
        media={post.media}
        startIndex={lightboxStart}
        caption={post.caption}
      />
    </article>
  );
}

function LockedRow({
  status,
  fresh,
}: {
  status: PortalPost["status"];
  fresh: boolean;
}) {
  const { icon: Icon, text, tone } = lockedCopy(status, fresh);
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium",
        tone === "accent"
          ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent"
          : "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success",
      )}
    >
      <Icon className="size-4.5 shrink-0" />
      {text}
    </div>
  );
}

/** Clean, media-forward Sanctum card — the calm alternative to the social chrome. */
function SanctumCard({
  post,
  status,
  brand,
  onOpenMedia,
}: {
  post: PortalPost;
  status: PortalPost["status"];
  brand: PreviewBrand;
  onOpenMedia: (i: number) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => post.media.length && onOpenMedia(0)}
        disabled={!post.media.length}
        aria-label={post.media.length ? "View media full size" : "No media yet"}
        className={cn(
          "relative block w-full overflow-hidden",
          post.media.length ? "cursor-zoom-in" : "cursor-default",
        )}
        style={{ aspectRatio: post.postType === "reel" || post.postType === "story" ? "4 / 5" : "16 / 10" }}
      >
        <CardMedia post={post} brand={brand} />
      </button>
      <div className="space-y-2.5 p-4">
        <div className="flex items-center gap-2">
          <TypeTag type={post.postType} />
          <PlatformBadges platforms={post.platforms} />
        </div>
        <p className="line-clamp-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-foreground/85">
          {post.caption || (
            <span className="italic text-muted-foreground">No caption yet.</span>
          )}
        </p>
      </div>
    </div>
  );
}

function CardMedia({ post, brand }: { post: PortalPost; brand: PreviewBrand }) {
  const hero = post.media[0];
  const [broken, setBroken] = React.useState(false);
  if (!hero || broken) {
    return (
      <span
        className="absolute inset-0 grid place-items-center"
        style={{
          background: `radial-gradient(120% 120% at 30% 0%, color-mix(in srgb, ${brand.brandColor} 24%, transparent), transparent 60%), color-mix(in srgb, ${brand.brandColor} 8%, var(--card))`,
        }}
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
          Visual in production
        </span>
      </span>
    );
  }
  if (hero.resourceType === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={hero.secureUrl}
        className="size-full object-cover"
        muted
        playsInline
        preload="metadata"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hero.secureUrl}
      alt={post.caption ? `Preview: ${post.caption.slice(0, 80)}` : "Post preview"}
      width={hero.width ?? undefined}
      height={hero.height ?? undefined}
      loading="lazy"
      decoding="async"
      className="size-full object-cover"
      onError={() => setBroken(true)}
    />
  );
}
