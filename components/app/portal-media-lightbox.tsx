"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface LightboxMedia {
  resourceType: "image" | "video";
  secureUrl: string;
}

/**
 * Full-screen media viewer. Pages every slide (touch swipe + arrow keys +
 * on-screen arrows), shows a slide counter, double-tap / button zoom for images,
 * native video controls (autoplay-muted), and the caption. Radix Dialog provides
 * focus-trap + body-scroll-lock + ESC; we add the carousel + zoom on top.
 */
export function PortalMediaLightbox({
  open,
  onOpenChange,
  media,
  startIndex = 0,
  caption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: LightboxMedia[];
  startIndex?: number;
  caption?: string | null;
}) {
  const [i, setI] = React.useState(startIndex);
  const [zoom, setZoom] = React.useState(false);
  const touch = React.useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = React.useRef(0);

  React.useEffect(() => {
    if (open) {
      setI(Math.min(startIndex, Math.max(0, media.length - 1)));
      setZoom(false);
    }
  }, [open, startIndex, media.length]);

  const many = media.length > 1;
  const go = React.useCallback(
    (delta: number) => {
      setZoom(false);
      setI((x) => (x + delta + media.length) % media.length);
    },
    [media.length],
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!many) return;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, many, go]);

  if (!media.length) return null;
  const cur = media[Math.min(i, media.length - 1)];
  const isVideo = cur.resourceType === "video";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] max-w-none flex-col gap-0 border-0 bg-black/97 p-0 backdrop-blur-xl sm:h-[92vh] sm:max-w-4xl sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">Media preview</DialogTitle>

        {/* Top bar: counter + close */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
            {i + 1} / {media.length}
          </span>
          <div className="flex items-center gap-1.5">
            {!isVideo && (
              <button
                type="button"
                aria-label={zoom ? "Zoom out" : "Zoom in"}
                aria-pressed={zoom}
                onClick={() => setZoom((z) => !z)}
                className={cn(
                  "grid size-9 place-items-center rounded-full text-white transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70",
                  zoom && "bg-white/20",
                )}
              >
                <ZoomIn className="size-5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="grid size-9 place-items-center rounded-full text-white transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Stage */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          onTouchStart={(e) => {
            touch.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              t: Date.now(),
            };
          }}
          onTouchEnd={(e) => {
            const now = Date.now();
            if (now - lastTap.current < 280 && !isVideo) {
              setZoom((z) => !z);
            }
            lastTap.current = now;
            if (!touch.current || !many || zoom) return;
            const dx = e.changedTouches[0].clientX - touch.current.x;
            const dy = e.changedTouches[0].clientY - touch.current.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
            touch.current = null;
          }}
        >
          {isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={cur.secureUrl}
              src={cur.secureUrl}
              controls
              autoPlay
              muted
              playsInline
              className="max-h-full max-w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={cur.secureUrl}
              src={cur.secureUrl}
              alt={caption ?? "Post media"}
              onClick={() => setZoom((z) => !z)}
              className={cn(
                "max-h-full max-w-full select-none object-contain transition-transform duration-300 motion-reduce:transition-none",
                zoom ? "scale-[1.9] cursor-zoom-out" : "cursor-zoom-in",
              )}
            />
          )}

          {many && (
            <>
              <button
                type="button"
                aria-label="Previous media"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next media"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        {/* Footer: dots + caption */}
        {(many || caption) && (
          <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            {many && (
              <div className="mb-2 flex justify-center gap-1.5">
                {media.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Go to media ${idx + 1}`}
                    aria-current={idx === i}
                    onClick={() => {
                      setZoom(false);
                      setI(idx);
                    }}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      idx === i ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70",
                    )}
                  />
                ))}
              </div>
            )}
            {caption && (
              <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-white/85">
                {caption}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
