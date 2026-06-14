"use client";

import * as React from "react";
import type { FieldValues } from "react-hook-form";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BaseFieldProps, RequiredMark } from "./field-context";
import { DatePickerPresets } from "./date-picker/date-picker-presets";
import { DatePickerTextInput } from "./date-picker/date-picker-text-input";
import {
  DEFAULT_PRESETS,
  startOfDay,
  type DatePickerPreset,
} from "./date-picker/date-picker.utils";

export interface DatePickerFieldProps<T extends FieldValues>
  extends BaseFieldProps<T> {
  /** Earliest selectable date (inclusive). Days before are disabled. */
  fromDate?: Date;
  /** Latest selectable date (inclusive). Days after are disabled. */
  toDate?: Date;
  /**
   * Write the picked value back to RHF as an ISO `yyyy-MM-dd` string instead of
   * a `Date`. Defaults to `false` so the field stays a drop-in replacement for
   * the old `DateField` (whose forms store `Date` objects and call
   * `.toISOString()` on submit). Either way the API wire format stays ISO.
   */
  valueAsISO?: boolean;
  /** Hide the inline "Clear" affordance (e.g. for required, always-set dates). */
  clearable?: boolean;
  /** Show the presets column (Today / Tomorrow / …). Default `true`. */
  showPresets?: boolean;
  /** Override the preset shortcuts. Defaults to `DEFAULT_PRESETS`. */
  presets?: DatePickerPreset[];
  /** Show the natural-language text input above the calendar. Default `true`. */
  enableTextInput?: boolean;
  /** Ring today's cell in brass/accent so it never clashes with selection. Default `true`. */
  showTodayIndicator?: boolean;
  /** Placeholder for the natural-language text input. */
  textInputPlaceholder?: string;
}

/**
 * RHF-bound calendar date picker, v2. A button trigger shows the formatted date
 * ("16 Jun 2026") or the placeholder; clicking opens a collision-safe Popover
 * (align start, sideOffset 4, Radix auto-flip) with three coordinated surfaces:
 * a presets sidebar, a natural-language text input, and an Evergreen Calendar.
 *
 * The popover is ~520px on desktop and `90vw` on mobile, where the presets
 * collapse from a sidebar rail into a horizontal chip row above the calendar.
 * Selecting a day, committing a preset, or pressing Enter on a parsed phrase all
 * set the value AND close. Today is ringed in accent (brass) while the selected
 * day uses `bg-primary`, so "today" and "selected" never collide visually.
 *
 * Drop-in for v1: same prop surface (name, label, description, placeholder,
 * required, disabled, fromDate, toDate, valueAsISO, clearable, className) plus
 * additive, defaulted props (showPresets, presets, enableTextInput,
 * showTodayIndicator, textInputPlaceholder).
 */
export function DatePickerField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "Pick a date",
  disabled,
  required,
  fromDate,
  toDate,
  valueAsISO = false,
  clearable = true,
  showPresets = true,
  presets = DEFAULT_PRESETS,
  enableTextInput = true,
  showTodayIndicator = true,
  textInputPlaceholder,
  className,
}: DatePickerFieldProps<T>) {
  const [open, setOpen] = React.useState(false);
  // `today` is captured once per render-cycle so presets/text-input/calendar all
  // agree on "now" while the popover is open.
  const today = React.useMemo(() => startOfDay(new Date()), []);
  // Live preview month driven by the text input (navigates the calendar without
  // committing). Resets whenever the popover closes.
  const [previewMonth, setPreviewMonth] = React.useState<Date | undefined>(
    undefined,
  );

  React.useEffect(() => {
    if (!open) setPreviewMonth(undefined);
  }, [open]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const raw = field.value as unknown;
        const value: Date | undefined =
          raw instanceof Date
            ? raw
            : raw
              ? new Date(raw as string | number)
              : undefined;
        const valid =
          value && !Number.isNaN(value.getTime()) ? value : undefined;

        const commit = (d: Date | undefined, close = true) => {
          if (!d) {
            field.onChange(valueAsISO ? "" : undefined);
          } else {
            field.onChange(valueAsISO ? format(d, "yyyy-MM-dd") : d);
          }
          if (close) setOpen(false);
        };

        const isDayDisabled = (date: Date) =>
          (fromDate ? startOfDay(date) < startOfDay(fromDate) : false) ||
          (toDate ? startOfDay(date) > startOfDay(toDate) : false);

        const showSidebar = showPresets;

        return (
          <FormItem className={cn("flex flex-col", className)}>
            {label && (
              <FormLabel>
                {label}
                <RequiredMark required={required} />
              </FormLabel>
            )}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-label={
                      typeof label === "string" ? label : "Pick a date"
                    }
                    className={cn(
                      "h-11 w-full justify-start text-left font-normal",
                      !valid && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4 shrink-0" />
                    <span className="truncate tabular-nums">
                      {valid ? format(valid, "d MMM yyyy") : placeholder}
                    </span>
                    {valid && clearable && !disabled && (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label="Clear date"
                        className="ml-auto grid size-5 shrink-0 place-items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          commit(undefined, false);
                        }}
                      >
                        <X className="size-3.5" />
                      </span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={4}
                collisionPadding={8}
                className="w-[min(520px,90vw)] overflow-hidden p-0"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Desktop: vertical presets rail. */}
                  {showSidebar && (
                    <DatePickerPresets
                      className="hidden sm:flex"
                      presets={presets}
                      today={today}
                      selected={valid}
                      fromDate={fromDate}
                      toDate={toDate}
                      variant="sidebar"
                      onSelect={(d) => commit(d ?? undefined)}
                    />
                  )}

                  <div className="flex min-w-0 flex-1 flex-col">
                    {/* Mobile: presets become a horizontal chip row. */}
                    {showSidebar && (
                      <DatePickerPresets
                        className="flex sm:hidden"
                        presets={presets}
                        today={today}
                        selected={valid}
                        fromDate={fromDate}
                        toDate={toDate}
                        variant="chips"
                        onSelect={(d) => commit(d ?? undefined)}
                      />
                    )}

                    {enableTextInput && (
                      <div className="border-b p-3">
                        <DatePickerTextInput
                          today={today}
                          fromDate={fromDate}
                          toDate={toDate}
                          placeholder={textInputPlaceholder}
                          onPreview={(d) => setPreviewMonth(d ?? undefined)}
                          onCommit={(d) => commit(d)}
                        />
                      </div>
                    )}

                    <Calendar
                      mode="single"
                      className="p-3"
                      selected={valid}
                      month={previewMonth}
                      defaultMonth={previewMonth ?? valid ?? today}
                      onMonthChange={setPreviewMonth}
                      onSelect={(d) => commit(d ?? undefined)}
                      disabled={isDayDisabled}
                      // Pin the today modifier to our captured `today` (and drop
                      // it entirely when the indicator is off).
                      modifiers={showTodayIndicator ? { today } : { today: false }}
                      classNames={
                        showTodayIndicator
                          ? {
                              // Brass/accent ring on today — replaces the default
                              // `bg-accent` fill so today stays distinct from the
                              // primary-filled selected day and the two never clash.
                              today:
                                "rounded-md bg-transparent font-semibold text-foreground ring-1 ring-inset ring-accent data-[selected=true]:ring-2",
                            }
                          : {
                              today: "rounded-md bg-transparent text-foreground",
                            }
                      }
                      autoFocus
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
