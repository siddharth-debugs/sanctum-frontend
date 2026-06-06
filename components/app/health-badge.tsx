import { cn } from "@/lib/utils";
import type { RelationshipHealth } from "@/lib/api/types";

/**
 * Relationship-health pill. Uses Evergreen tokens tastefully:
 * Excellent → success (emerald), Good → primary (pine/brass accent),
 * At risk → warning (amber), Poor → destructive.
 */
const HEALTH_CONFIG: Record<
  RelationshipHealth,
  { label: string; className: string }
> = {
  excellent: {
    label: "Excellent",
    className:
      "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]",
  },
  good: {
    label: "Good",
    className:
      "text-accent bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]",
  },
  at_risk: {
    label: "At risk",
    className:
      "text-warning bg-[color-mix(in_srgb,var(--warning)_18%,transparent)]",
  },
  poor: {
    label: "Poor",
    className:
      "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
  },
};

export function HealthBadge({
  health,
  className,
}: {
  health?: RelationshipHealth | null;
  className?: string;
}) {
  if (!health) return null;
  const cfg = HEALTH_CONFIG[health];
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
