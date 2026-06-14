import * as React from "react";

import { cn } from "@/lib/utils";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_DOT,
} from "@/lib/constants/project-options";
import type { ProjectTaskStatus } from "@/lib/api/types";

export interface StatusBadgeProps extends React.ComponentProps<"span"> {
  status: ProjectTaskStatus;
  /** Drop the text label and render just the coloured dot (dense table cells). */
  dotOnly?: boolean;
}

/**
 * Canonical task-status pill (spec §6.4 / §6.5 dot-badge). Reads the single
 * source of truth `TASK_STATUS_DOT` for its colour so the sheet, every view and
 * the milestone board show identical status chips. The dot is the colour
 * signal; the always-present text label means status is never colour-only.
 */
export function StatusBadge({
  status,
  dotOnly = false,
  className,
  ...props
}: StatusBadgeProps) {
  const dot = (
    <span
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: TASK_STATUS_DOT[status] }}
    />
  );

  if (dotOnly) {
    return (
      <span
        data-slot="status-badge"
        data-status={status}
        className={cn("inline-flex items-center", className)}
        title={TASK_STATUS_LABEL[status]}
        {...props}
      >
        {dot}
        <span className="sr-only">{TASK_STATUS_LABEL[status]}</span>
      </span>
    );
  }

  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] px-2 py-0.5 text-xs font-medium text-foreground/80",
        className,
      )}
      {...props}
    >
      {dot}
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}
