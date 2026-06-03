import { cn } from "@/lib/utils";
import type { PostStatus } from "@/lib/api/types";

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]",
  },
  pending_approval: {
    label: "Pending",
    className:
      "text-warning bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]",
  },
  approved: {
    label: "Approved",
    className:
      "text-primary bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
  },
  changes_requested: {
    label: "Changes",
    className:
      "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
  },
  scheduled: {
    label: "Scheduled",
    className:
      "text-accent bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]",
  },
  posted: {
    label: "Posted",
    className:
      "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: PostStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        cfg.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}
