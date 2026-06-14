import * as React from "react";
import { CalendarClock } from "lucide-react";
import {
  isToday,
  isTomorrow,
  isThisYear,
  differenceInCalendarDays,
  format,
} from "date-fns";

import { cn } from "@/lib/utils";

export interface DueChipProps extends React.ComponentProps<"span"> {
  /** ISO due date, or null when unset. */
  date: string | null | undefined;
  /** Hide the small calendar glyph (e.g. very dense table cells). */
  hideIcon?: boolean;
  /** Render nothing instead of an em-dash when there is no due date. */
  hideWhenEmpty?: boolean;
}

type Tone = "overdue" | "today" | "soon" | "future" | "empty";

/** Bucket a due date into a colour tone relative to today. */
function dueTone(d: Date): Exclude<Tone, "empty"> {
  if (isToday(d)) return "today";
  const days = differenceInCalendarDays(d, new Date());
  if (days < 0) return "overdue";
  if (days <= 2) return "soon";
  return "future";
}

/** Compact, accessible label for the date. */
function dueLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return isThisYear(d) ? format(d, "MMM d") : format(d, "MMM d, yyyy");
}

const TONE_CLASS: Record<Exclude<Tone, "empty">, string> = {
  // Overdue → destructive; today → warning; everything else stays muted so the
  // chip only "shouts" when it needs attention (spec §6.5).
  overdue: "text-destructive",
  today: "text-warning",
  soon: "text-foreground/80",
  future: "text-muted-foreground",
};

/**
 * The single due-date chip (spec §6.5). Colours overdue dates destructive and
 * today's warning, leaving future/no-date muted; dates use `tabular-nums` so
 * columns of dates align. The icon + word "Overdue"/"Today" mean the urgency is
 * conveyed by text, not colour alone.
 */
export function DueChip({
  date,
  hideIcon = false,
  hideWhenEmpty = false,
  className,
  ...props
}: DueChipProps) {
  if (!date) {
    if (hideWhenEmpty) return null;
    return (
      <span
        data-slot="due-chip"
        data-tone="empty"
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums",
          className,
        )}
        {...props}
      >
        {!hideIcon && <CalendarClock className="size-3.5" aria-hidden />}
        —
      </span>
    );
  }

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return (
      <span
        data-slot="due-chip"
        data-tone="empty"
        className={cn("text-xs text-muted-foreground", className)}
        {...props}
      >
        —
      </span>
    );
  }

  const tone = dueTone(d);
  const label = dueLabel(d);
  const srPrefix = tone === "overdue" ? "Overdue, " : "Due ";

  return (
    <span
      data-slot="due-chip"
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        TONE_CLASS[tone],
        className,
      )}
      title={`${srPrefix}${label}`}
      {...props}
    >
      {!hideIcon && <CalendarClock className="size-3.5" aria-hidden />}
      <span>{tone === "overdue" ? `Overdue · ${label}` : label}</span>
    </span>
  );
}
