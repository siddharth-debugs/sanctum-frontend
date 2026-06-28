"use client";

import * as React from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Play,
  Repeat2,
  BarChart3,
  ThumbsUp,
  Share2,
  ImageOff,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { handleFor, brandDisplayName, normalizePlatform } from "@/lib/portal-handles";
import type { PortalPost } from "@/lib/api/types";

type Media = PortalPost["media"][number];

export interface PreviewBrand {
  clientName: string;
  logoUrl?: string | null;
  brandColor: string;
  handles?: Record<string, string> | null;
}

/** Verified-tick flourish — purely decorative, sells the "real account" feel. */
function Verified({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-3.5", className)} aria-hidden fill="currentColor">
      <path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L3 16.3l.9-2.9L3 10.5l2.6-1.5 1-2.8 3 .2L12 2z" />
      <path d="M10.6 14.6l-2.2-2.2-1.1 1.1 3.3 3.3 5.6-5.6-1.1-1.1z" fill="#fff" />
    </svg>
  );
}

/** Brand avatar — client logo, else a brand-colored monogram. */
function Avatar({
  brand,
  size = 32,
  ring,
}: {
  brand: PreviewBrand;
  size?: number;
  ring?: boolean;
}) {
  const [broken, setBroken] = React.useState(false);
  const px = `${size}px`;
  if (brand.logoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn("shrink-0 rounded-full object-cover", ring && "ring-2 ring-white")}
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold text-white",
        ring && "ring-2 ring-white",
      )}
      style={{
        width: px,
        height: px,
        background: brand.brandColor,
        fontSize: size * 0.4,
      }}
    >
      {initials(brand.clientName)}
    </span>
  );
}

/**
 * Shared media frame used inside every preview. Handles carousels (swipe + dots +
 * arrows), video play affordance, and a branded placeholder when media is absent
 * or fails to load. Dimensions are passed so there's no layout shift.
 */
function PreviewMedia({
  media,
  brand,
  ratio,
  rounded,
  onOpen,
  showCount = true,
}: {
  media: Media[];
  brand: PreviewBrand;
  /** CSS aspect-ratio string, e.g. "4 / 5" or "1 / 1" or "16 / 9". */
  ratio: string;
  rounded?: boolean;
  onOpen?: (index: number) => void;
  showCount?: boolean;
}) {
  const [i, setI] = React.useState(0);
  const [broken, setBroken] = React.useState<Record<number, boolean>>({});
  const touch = React.useRef<{ x: number; y: number } | null>(null);
  const many = media.length > 1;
  const cur = media[Math.min(i, Math.max(0, media.length - 1))];

  const go = (delta: number) =>
    setI((x) => (x + delta + media.length) % media.length);

  if (!media.length) {
    return (
      <div
        className={cn("relative w-full overflow-hidden", rounded && "rounded-xl")}
        style={{
          aspectRatio: ratio,
          background: `radial-gradient(120% 120% at 30% 0%, color-mix(in srgb, ${brand.brandColor} 26%, transparent), transparent 62%), color-mix(in srgb, ${brand.brandColor} 8%, var(--card))`,
        }}
      >
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex flex-col items-center gap-2 text-foreground/45">
            <ImageOff className="size-7" />
            <span className="text-[11px] font-medium uppercase tracking-wide">
              Visual in production
            </span>
          </span>
        </span>
      </div>
    );
  }

  const isBroken = broken[i % media.length];

  return (
    <div
      className={cn(
        "group/media relative w-full select-none overflow-hidden bg-black",
        rounded && "rounded-xl",
      )}
      style={{ aspectRatio: ratio }}
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!touch.current || !many) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <button
        type="button"
        onClick={() => onOpen?.(i)}
        aria-label="Open media full screen"
        className="absolute inset-0 size-full cursor-zoom-in"
      >
        {isBroken ? (
          <span
            className="absolute inset-0 grid place-items-center"
            style={{
              background: `linear-gradient(160deg, color-mix(in srgb, ${brand.brandColor} 20%, #1a1a1a), #111)`,
            }}
          >
            <ImageOff className="size-7 text-white/40" />
          </span>
        ) : cur.resourceType === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={cur.secureUrl + i}
            src={cur.secureUrl}
            className="size-full object-cover"
            muted
            playsInline
            preload="metadata"
            onError={() => setBroken((b) => ({ ...b, [i % media.length]: true }))}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cur.secureUrl}
            alt=""
            width={cur.width ?? undefined}
            height={cur.height ?? undefined}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onError={() => setBroken((b) => ({ ...b, [i % media.length]: true }))}
          />
        )}
      </button>

      {cur.resourceType === "video" && !isBroken && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <Play className="size-6 translate-x-0.5 fill-current" />
          </span>
        </span>
      )}

      {many && (
        <>
          {showCount && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
              {(i % media.length) + 1}/{media.length}
            </span>
          )}
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="absolute left-1.5 top-1/2 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black opacity-0 shadow transition group-hover/media:opacity-100 focus-visible:opacity-100 sm:grid"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="absolute right-1.5 top-1/2 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black opacity-0 shadow transition group-hover/media:opacity-100 focus-visible:opacity-100 sm:grid"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
            {media.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "size-1.5 rounded-full transition",
                  idx === i % media.length ? "bg-white" : "bg-white/45",
                )}
              />
            ))}
          </span>
        </>
      )}
    </div>
  );
}

/** Caption with a "… more" expander mirroring social truncation. */
function Caption({
  text,
  handle,
  className,
  lead,
}: {
  text: string | null;
  handle?: string;
  className?: string;
  /** Bold lead token (the handle) rendered before the caption, IG-style. */
  lead?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  if (!text) {
    return (
      <p className={cn("italic text-foreground/40", className)}>No caption yet.</p>
    );
  }
  const long = text.length > 120;
  const shown = open || !long ? text : text.slice(0, 120).trimEnd();
  return (
    <p className={cn("whitespace-pre-line break-words", className)}>
      {lead && handle && (
        <span className="mr-1.5 font-semibold text-foreground">{handle}</span>
      )}
      {shown}
      {long && !open && (
        <>
          {"… "}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-medium text-foreground/45 hover:text-foreground/70"
          >
            more
          </button>
        </>
      )}
    </p>
  );
}

// In-feed Instagram crop. Reels/stories appear at 4:5 in the feed (not the
// full-screen 9:16) so the post + the action tray below stay readable; the
// Reel/Story badge keeps the post type unmistakable.
const igAspect = (_p: PortalPost) => "4 / 5";

// ---------------------------------------------------------------------------
// Per-platform shells. Each renders authentic chrome around the shared media.
// All are typographically tuned to feel native (system font, tight tracking).
// ---------------------------------------------------------------------------

function InstagramPreview({
  post,
  brand,
  onOpen,
}: {
  post: PortalPost;
  brand: PreviewBrand;
  onOpen?: (i: number) => void;
}) {
  const handle = handleFor("instagram", brand.handles, brand.clientName);
  const reel = post.postType === "reel";
  const story = post.postType === "story";
  return (
    <div className="portal-native overflow-hidden bg-white text-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full bg-[linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf)] p-[2px]">
          <span className="block rounded-full bg-white p-[2px] dark:bg-[#0a0a0a]">
            <Avatar brand={brand} size={30} />
          </span>
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1 text-[13px] font-semibold">
            <span className="truncate">{handle}</span>
            <Verified className="text-[#3897f0]" />
          </span>
          {(reel || story) && (
            <span className="text-[11px] text-[#737373]">
              {reel ? "Original audio" : "Story"}
            </span>
          )}
        </div>
        <MoreHorizontal className="size-5 shrink-0 text-[#262626] dark:text-[#fafafa]" />
      </div>

      <div className="relative">
        <PreviewMedia
          media={post.media}
          brand={brand}
          ratio={igAspect(post)}
          onOpen={onOpen}
        />
        {(reel || story) && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            {reel ? "Reel" : "Story"}
          </span>
        )}
      </div>

      {!story && (
        <>
          <div className="flex items-center gap-4 px-3 pb-1 pt-2.5">
            <Heart className="size-6" />
            <MessageCircle className="size-6 -scale-x-100" />
            <Send className="size-[22px]" />
            <Bookmark className="ml-auto size-6" />
          </div>
          <p className="px-3 text-[13px] font-semibold">1,248 likes</p>
          <div className="px-3 pb-1 pt-1 text-[13px] leading-snug">
            <Caption text={post.caption} handle={handle} lead />
          </div>
          <p className="px-3 text-[13px] text-[#737373]">View all 38 comments</p>
          <p className="px-3 pb-3 pt-1 text-[10px] uppercase tracking-wide text-[#737373]">
            {post.scheduledAt ? formatRelativeTime(post.scheduledAt) : "Just now"}
          </p>
        </>
      )}
      {story && (
        <div className="px-3 pb-3 pt-2 text-[13px] leading-snug">
          <Caption text={post.caption} className="text-foreground/80" />
        </div>
      )}
    </div>
  );
}

function XPreview({
  post,
  brand,
  onOpen,
}: {
  post: PortalPost;
  brand: PreviewBrand;
  onOpen?: (i: number) => void;
}) {
  const handle = handleFor("x", brand.handles, brand.clientName);
  const name = brandDisplayName(brand.clientName);
  return (
    <div className="portal-native bg-white px-3 py-3 text-[#0f1419] dark:bg-black dark:text-[#e7e9ea]">
      <div className="flex gap-2.5">
        <Avatar brand={brand} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px] leading-tight">
            <span className="truncate font-bold">{name}</span>
            <Verified className="text-[#1d9bf0]" />
            <span className="truncate text-[#536471] dark:text-[#71767b]">
              @{handle}
            </span>
            <span className="text-[#536471] dark:text-[#71767b]">·</span>
            <span className="shrink-0 text-[#536471] dark:text-[#71767b]">
              {post.scheduledAt ? formatRelativeTime(post.scheduledAt) : "now"}
            </span>
            <MoreHorizontal className="ml-auto size-4 shrink-0 text-[#536471]" />
          </div>
          <div className="mt-0.5 text-[15px] leading-snug">
            <Caption text={post.caption} />
          </div>
          {(post.media.length > 0 || true) && (
            <div className="mt-2.5 overflow-hidden rounded-2xl border border-[#cfd9de] dark:border-[#2f3336]">
              <PreviewMedia
                media={post.media}
                brand={brand}
                ratio="16 / 9"
                onOpen={onOpen}
              />
            </div>
          )}
          <div className="mt-2.5 flex max-w-[340px] items-center justify-between text-[#536471] dark:text-[#71767b]">
            <span className="flex items-center gap-1 text-[13px]">
              <MessageCircle className="size-[18px]" /> 24
            </span>
            <span className="flex items-center gap-1 text-[13px]">
              <Repeat2 className="size-[18px]" /> 18
            </span>
            <span className="flex items-center gap-1 text-[13px]">
              <Heart className="size-[18px]" /> 312
            </span>
            <span className="flex items-center gap-1 text-[13px]">
              <BarChart3 className="size-[18px]" /> 9.1K
            </span>
            <Share2 className="size-[18px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({
  post,
  brand,
  onOpen,
}: {
  post: PortalPost;
  brand: PreviewBrand;
  onOpen?: (i: number) => void;
}) {
  const name = brandDisplayName(brand.clientName);
  return (
    <div className="portal-native bg-white text-[#050505] dark:bg-[#242526] dark:text-[#e4e6eb]">
      <div className="flex items-center gap-2.5 px-3 pt-3">
        <Avatar brand={brand} size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1 text-[15px] font-semibold">
            <span className="truncate">{name}</span>
            <Verified className="text-[#1877f2]" />
          </span>
          <span className="flex items-center gap-1 text-[12px] text-[#65676b] dark:text-[#b0b3b8]">
            {post.scheduledAt ? formatRelativeTime(post.scheduledAt) : "Just now"}
            <span>·</span>
            <Globe className="size-3" />
          </span>
        </div>
        <MoreHorizontal className="size-5 shrink-0 text-[#65676b] dark:text-[#b0b3b8]" />
      </div>
      <div className="px-3 py-2.5 text-[15px] leading-snug">
        <Caption text={post.caption} />
      </div>
      <PreviewMedia
        media={post.media}
        brand={brand}
        ratio={post.postType === "reel" ? "4 / 5" : "1 / 1"}
        onOpen={onOpen}
      />
      <div className="flex items-center justify-between px-3 py-1.5 text-[12px] text-[#65676b] dark:text-[#b0b3b8]">
        <span className="flex items-center gap-1">
          <span className="grid size-[18px] place-items-center rounded-full bg-[#1877f2] text-white">
            <ThumbsUp className="size-2.5 fill-current" />
          </span>
          312
        </span>
        <span>24 comments · 11 shares</span>
      </div>
      <div className="mx-3 grid grid-cols-3 border-t border-[#ced0d4] py-1 text-[14px] font-semibold text-[#65676b] dark:border-[#3e4042] dark:text-[#b0b3b8]">
        <span className="flex items-center justify-center gap-2 py-1.5">
          <ThumbsUp className="size-[18px]" /> Like
        </span>
        <span className="flex items-center justify-center gap-2 py-1.5">
          <MessageCircle className="size-[18px]" /> Comment
        </span>
        <span className="flex items-center justify-center gap-2 py-1.5">
          <Share2 className="size-[18px]" /> Share
        </span>
      </div>
    </div>
  );
}

function LinkedInPreview({
  post,
  brand,
  onOpen,
}: {
  post: PortalPost;
  brand: PreviewBrand;
  onOpen?: (i: number) => void;
}) {
  const name = brandDisplayName(brand.clientName);
  return (
    <div className="portal-native bg-white text-[#000000e6] dark:bg-[#1b1f23] dark:text-[#ffffffe6]">
      <div className="flex items-start gap-2.5 px-3 pt-3">
        <Avatar brand={brand} size={44} />
        <div className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14px] font-semibold">{name}</span>
          <span className="block truncate text-[12px] text-[#00000099] dark:text-[#ffffff99]">
            Cafe · Restaurant
          </span>
          <span className="flex items-center gap-1 text-[12px] text-[#00000099] dark:text-[#ffffff99]">
            {post.scheduledAt ? formatRelativeTime(post.scheduledAt) : "now"} ·{" "}
            <Globe className="size-3" />
          </span>
        </div>
        <MoreHorizontal className="size-5 shrink-0 text-[#00000099]" />
      </div>
      <div className="px-3 py-2.5 text-[14px] leading-snug">
        <Caption text={post.caption} />
      </div>
      <PreviewMedia
        media={post.media}
        brand={brand}
        ratio={post.postType === "reel" ? "4 / 5" : "1.91 / 1"}
        onOpen={onOpen}
      />
      <div className="flex items-center justify-between px-3 pb-1 pt-1.5 text-[12px] text-[#00000099] dark:text-[#ffffff99]">
        <span className="flex items-center gap-1">
          <span className="grid size-[16px] place-items-center rounded-full bg-[#378fe9] text-white">
            <ThumbsUp className="size-2.5 fill-current" />
          </span>
          187
        </span>
        <span>14 comments</span>
      </div>
      <div className="mx-3 grid grid-cols-4 border-t border-[#00000014] py-1 text-[13px] font-semibold text-[#00000099] dark:border-white/10 dark:text-[#ffffff99]">
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <ThumbsUp className="size-[18px]" /> Like
        </span>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <MessageCircle className="size-[18px]" /> Comment
        </span>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <Repeat2 className="size-[18px]" /> Repost
        </span>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <Send className="size-[18px]" /> Send
        </span>
      </div>
    </div>
  );
}

function YouTubePreview({
  post,
  brand,
  onOpen,
}: {
  post: PortalPost;
  brand: PreviewBrand;
  onOpen?: (i: number) => void;
}) {
  const name = brandDisplayName(brand.clientName);
  const short = post.postType === "reel" || post.postType === "story";
  return (
    <div className="portal-native bg-white text-[#0f0f0f] dark:bg-[#0f0f0f] dark:text-white">
      <PreviewMedia
        media={post.media}
        brand={brand}
        ratio={short ? "9 / 16" : "16 / 9"}
        onOpen={onOpen}
      />
      <div className="flex gap-2.5 px-3 py-3">
        <Avatar brand={brand} size={36} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-semibold leading-snug">
            {post.caption || "Untitled video"}
          </p>
          <p className="mt-1 text-[12px] text-[#606060] dark:text-[#aaa]">
            {name} · 8.4K views ·{" "}
            {post.scheduledAt ? formatRelativeTime(post.scheduledAt) : "now"}
          </p>
        </div>
        <MoreHorizontal className="size-5 shrink-0 text-[#606060] dark:text-[#aaa]" />
      </div>
    </div>
  );
}

const SHELLS: Record<
  string,
  (p: { post: PortalPost; brand: PreviewBrand; onOpen?: (i: number) => void }) => React.ReactNode
> = {
  instagram: InstagramPreview,
  x: XPreview,
  facebook: FacebookPreview,
  linkedin: LinkedInPreview,
  youtube: YouTubePreview,
};

/**
 * Renders a single post as a faithful platform preview. `platform` selects the
 * chrome; unknown platforms fall back to the Instagram shell (the most universal
 * square/portrait media frame).
 */
export function PortalPlatformPreview({
  post,
  platform,
  brand,
  onOpenMedia,
}: {
  post: PortalPost;
  platform: string;
  brand: PreviewBrand;
  onOpenMedia?: (index: number) => void;
}) {
  const key = normalizePlatform(platform);
  const Shell = SHELLS[key] ?? InstagramPreview;
  return <Shell post={post} brand={brand} onOpen={onOpenMedia} />;
}
