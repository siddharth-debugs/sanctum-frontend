import * as React from "react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, ROLE_BADGE_CLASS } from "@/lib/constants/team-options";
import type { Role } from "@/lib/api/types";

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

/** Evergreen role pill: Owner=primary pine, Admin=accent brass, Member=muted. */
export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  return (
    <span className={cn(pill, ROLE_BADGE_CLASS[role], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {ROLE_LABEL[role]}
    </span>
  );
}

/** Small muted "Inactive" chip for disabled members. */
export function InactiveChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)] px-2.5 py-1 text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      Inactive
    </span>
  );
}

/** Tint for a utilization bar by load: <70% normal · 70–100% accent · >100% destructive. */
export function utilizationColor(pct: number): string {
  if (pct > 100) return "var(--destructive)";
  if (pct >= 70) return "var(--accent)";
  return "var(--primary)";
}

/**
 * Thin utilization bar. By default the fill is a pine→brass gradient; pass
 * `tintByLoad` to instead tint the fill by load (normal / accent / destructive).
 */
export function UtilizationBar({
  pct,
  tintByLoad = false,
  className,
}: {
  pct: number;
  tintByLoad?: boolean;
  className?: string;
}) {
  const width = Math.min(100, Math.max(0, pct));
  const fill = tintByLoad
    ? { backgroundColor: utilizationColor(pct) }
    : {
        background:
          "linear-gradient(90deg,var(--primary),var(--accent))",
      };
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_18%,transparent)]",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${width}%`, ...fill }}
      />
    </div>
  );
}
