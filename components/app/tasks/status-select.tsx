"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TASK_STATUSES,
  TASK_STATUS_DOT,
  TASK_STATUS_LABEL,
} from "@/lib/constants/project-options";
import type { ProjectTaskStatus } from "@/lib/api/types";

export interface StatusSelectProps {
  value: ProjectTaskStatus;
  onChange: (value: ProjectTaskStatus) => void;
  disabled?: boolean;
  /** Trigger height — "sm" (h-8, dense inline) or "default" (h-9). */
  size?: "sm" | "default";
  className?: string;
  "aria-label"?: string;
}

/** Coloured status dot used inside the trigger + each item. */
function Dot({ status }: { status: ProjectTaskStatus }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: TASK_STATUS_DOT[status] }}
    />
  );
}

/**
 * Inline status switcher (spec §4.1 quick-switcher). Wraps the shared Select
 * primitive, reads `TASK_STATUSES` / `TASK_STATUS_DOT` so its options and dots
 * always match `StatusBadge`. Used identically by the sheet header, list rows
 * and table cells. Colour is paired with the status label, never alone.
 */
export function StatusSelect({
  value,
  onChange,
  disabled,
  size = "sm",
  className,
  "aria-label": ariaLabel = "Status",
}: StatusSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ProjectTaskStatus)}
      disabled={disabled}
    >
      <SelectTrigger
        size={size}
        aria-label={ariaLabel}
        className={cn("gap-1.5", className)}
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <Dot status={value} />
            {TASK_STATUS_LABEL[value]}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            <span className="flex items-center gap-2">
              <Dot status={s.value} />
              {s.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
