"use client";

import * as React from "react";
import { CalendarOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { isOutsideRange, type DatePickerPreset } from "./date-picker.utils";

interface DatePickerPresetsProps {
  presets: DatePickerPreset[];
  today: Date;
  /** Currently-committed value, used to mark the matching preset active. */
  selected?: Date;
  fromDate?: Date;
  toDate?: Date;
  /** Commit a preset's resolved date (or `null` to clear) and close. */
  onSelect: (date: Date | null) => void;
  /**
   * Layout: `sidebar` (desktop, vertical `w-44` rail) or `chips` (mobile,
   * horizontal wrap above the calendar).
   */
  variant?: "sidebar" | "chips";
  className?: string;
}

/**
 * Presets column per spec §5: Today / Tomorrow / This weekend / Next week /
 * In 2 weeks / No date. Each commits immediately and closes the popover.
 * Tab-reachable; the "No date" clear row is visually + iconographically
 * distinct so it never reads as a date (no color-only meaning).
 */
export function DatePickerPresets({
  presets,
  today,
  selected,
  fromDate,
  toDate,
  onSelect,
  variant = "sidebar",
  className,
}: DatePickerPresetsProps) {
  const isSelected = (preset: DatePickerPreset) => {
    const resolved = preset.resolve(today);
    if (resolved === null) return !selected; // "No date" active when unset
    if (!selected) return false;
    return resolved.getTime() === new Date(selected).setHours(0, 0, 0, 0);
  };

  return (
    <div
      role="group"
      aria-label="Date shortcuts"
      className={cn(
        variant === "sidebar"
          ? "flex w-44 shrink-0 flex-col gap-0.5 border-r bg-muted/40 p-2"
          : "flex flex-row flex-wrap gap-1.5 border-b p-3",
        className,
      )}
    >
      {presets.map((preset) => {
        const resolved = preset.resolve(today);
        const isClear = resolved === null;
        const disabled =
          resolved !== null && isOutsideRange(resolved, fromDate, toDate);
        const active = isSelected(preset);

        return (
          <button
            key={preset.id}
            type="button"
            data-preset={preset.id}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onSelect(resolved)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-md text-sm transition-colors duration-150 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
              "disabled:pointer-events-none disabled:opacity-40",
              variant === "sidebar"
                ? "w-full px-2.5 py-2 text-left"
                : "min-h-0 px-3 py-1.5",
              active
                ? "bg-primary/12 font-medium text-primary"
                : "text-foreground hover:bg-accent/10 hover:text-foreground",
              isClear && "text-muted-foreground",
            )}
          >
            {isClear && <CalendarOff className="size-3.5 shrink-0" aria-hidden />}
            <span className="truncate">{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}
