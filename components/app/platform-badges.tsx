import { cn } from "@/lib/utils";
import type { Platform, PostType } from "@/lib/api/types";

const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; style: string }
> = {
  instagram: {
    label: "IG",
    style: "bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] text-white",
  },
  facebook: { label: "f", style: "bg-[#1877f2] text-white" },
  linkedin: { label: "in", style: "bg-[#0a66c2] text-white" },
  youtube: { label: "YT", style: "bg-[#ff0000] text-white" },
  x: { label: "X", style: "bg-[#111] text-white" },
};

export function PlatformBadges({
  platforms,
  className,
}: {
  /** Free-form on the backend; unknown platforms render a generic chip. */
  platforms: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)}>
      {platforms.map((p) => {
        const cfg = PLATFORM_CONFIG[p as Platform] ?? {
          label: p.slice(0, 2).toUpperCase(),
          style: "bg-secondary text-secondary-foreground",
        };
        return (
          <span
            key={p}
            title={p}
            className={cn(
              "grid size-[22px] place-items-center rounded-[7px] text-[10px] font-bold",
              cfg.style,
            )}
          >
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

const TYPE_LABEL: Record<PostType, string> = {
  reel: "Reel",
  story: "Story",
  carousel: "Carousel",
  post: "Post",
};

export function TypeTag({ type }: { type: PostType }) {
  return (
    <span className="rounded-[7px] bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
      {TYPE_LABEL[type]}
    </span>
  );
}
