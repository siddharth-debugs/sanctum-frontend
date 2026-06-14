"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Themed single date picker NOT bound to react-hook-form — for page-level date
 * filters. Opens a Calendar popover that AUTO-CLOSES on select; renders an
 * inline clear (×) affordance when a value is set.
 *
 * Value stays a `Date | undefined` so existing filter pages (which call
 * `.toISOString()` for the API wire format) keep working unchanged.
 */
export function DatePickerStandalone({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  fromDate,
  toDate,
}: {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Earliest selectable date (inclusive). */
  fromDate?: Date;
  /** Latest selectable date (inclusive). */
  toDate?: Date;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          <span className="truncate">
            {value ? format(value, "d MMM yyyy") : placeholder}
          </span>
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
              className="ml-auto grid size-5 shrink-0 place-items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(undefined);
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(d) => {
            onChange(d ?? undefined);
            setOpen(false);
          }}
          disabled={(date) =>
            (fromDate ? date < fromDate : false) ||
            (toDate ? date > toDate : false)
          }
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
