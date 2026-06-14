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
import { PRIORITY_OPTIONS, PRIORITY_META } from "@/lib/constants/project-options";
import { PriorityIcon } from "./priority-icon";
import type { ProjectTaskPriority } from "@/lib/api/types";

export interface PrioritySelectProps {
  value: ProjectTaskPriority;
  onChange: (value: ProjectTaskPriority) => void;
  disabled?: boolean;
  /** Trigger height — "sm" (h-8) or "default" (h-9). */
  size?: "sm" | "default";
  /** Render only the icon in the trigger (dense cells); menu still labels. */
  iconOnly?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Inline priority switcher. Each option pairs the semantic `PriorityIcon` with
 * its text label so the bar/flag glyph and colour reinforce rather than replace
 * the wording. Reads `PRIORITY_OPTIONS` (urgent→none) and `PRIORITY_META`; used
 * identically by the sheet, quick-add and every view.
 */
export function PrioritySelect({
  value,
  onChange,
  disabled,
  size = "sm",
  iconOnly = false,
  className,
  "aria-label": ariaLabel = "Priority",
}: PrioritySelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ProjectTaskPriority)}
      disabled={disabled}
    >
      <SelectTrigger
        size={size}
        aria-label={ariaLabel}
        className={cn("gap-1.5", iconOnly && "w-auto px-2", className)}
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <PriorityIcon priority={value} hideLabel />
            {!iconOnly && PRIORITY_META[value].label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map((o) => {
          const p = o.value as ProjectTaskPriority;
          return (
            <SelectItem key={o.value} value={o.value}>
              <span className="flex items-center gap-2">
                <PriorityIcon priority={p} hideLabel />
                {o.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
