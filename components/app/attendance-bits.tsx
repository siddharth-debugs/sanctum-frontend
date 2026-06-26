"use client";

import { cn } from "@/lib/utils";
import {
  ATTENDANCE_STATUS_META,
  ATTENDANCE_LEGEND,
} from "@/lib/constants/attendance-options";
import type { AttendanceStatus } from "@/lib/api/types";

/** A coloured dot + label pill for an attendance status. */
export function AttendanceStatusBadge({
  status,
  className,
}: {
  status: AttendanceStatus;
  className?: string;
}) {
  const meta = ATTENDANCE_STATUS_META[status] ?? ATTENDANCE_STATUS_META.none;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        className,
      )}
      style={{
        color: meta.color,
        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
}

/** Legend strip explaining the calendar colours. */
export function AttendanceLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {ATTENDANCE_LEGEND.map((s) => {
        const meta = ATTENDANCE_STATUS_META[s];
        return (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="size-2.5 rounded-sm"
              style={{ background: meta.color }}
            />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
