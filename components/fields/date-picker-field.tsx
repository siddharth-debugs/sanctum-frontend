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
}

/**
 * RHF-bound calendar date picker. A button trigger shows the formatted date
 * ("16 Jun 2026") or the placeholder; clicking opens a themed Calendar popover.
 * Picking a day sets the field value AND auto-closes the popover. Accepts a
 * `Date`, an ISO string, or a timestamp as the stored value and normalizes it.
 *
 * Drop-in for `DateField`: same prop surface (name, label, description,
 * placeholder, required, disabled, fromDate, toDate, className).
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
  className,
}: DatePickerFieldProps<T>) {
  const [open, setOpen] = React.useState(false);

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
        const valid = value && !Number.isNaN(value.getTime()) ? value : undefined;

        const commit = (d: Date | undefined) => {
          if (!d) {
            field.onChange(valueAsISO ? "" : undefined);
            return;
          }
          field.onChange(valueAsISO ? format(d, "yyyy-MM-dd") : d);
        };

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
                    <span className="truncate">
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
                          commit(undefined);
                        }}
                      >
                        <X className="size-3.5" />
                      </span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={valid}
                  defaultMonth={valid}
                  onSelect={(d) => {
                    commit(d ?? undefined);
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
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
