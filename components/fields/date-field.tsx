"use client";

import type { FieldValues } from "react-hook-form";
import { CalendarIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BaseFieldProps, RequiredMark } from "./field-context";

export interface DateFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  fromDate?: Date;
  toDate?: Date;
  withTime?: boolean;
}

export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "Pick a date",
  disabled,
  required,
  fromDate,
  toDate,
  withTime,
  className,
}: DateFieldProps<T>) {
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

        const setTime = (time: string) => {
          const [h, m] = time.split(":").map(Number);
          const base = value ? new Date(value) : new Date();
          base.setHours(h || 0, m || 0, 0, 0);
          field.onChange(base);
        };

        return (
          <FormItem className={cn("flex flex-col", className)}>
            {label && (
              <FormLabel>
                {label}
                <RequiredMark required={required} />
              </FormLabel>
            )}
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disabled}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {value ? format(value, "PP") : placeholder}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(d) => {
                      if (!d) return field.onChange(undefined);
                      if (value && withTime) {
                        d.setHours(value.getHours(), value.getMinutes());
                      }
                      field.onChange(d);
                    }}
                    disabled={(date) =>
                      (fromDate ? date < fromDate : false) ||
                      (toDate ? date > toDate : false)
                    }
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              {withTime && (
                <Input
                  type="time"
                  className="w-28"
                  disabled={disabled}
                  value={value ? format(value, "HH:mm") : ""}
                  onChange={(e) => setTime(e.target.value)}
                />
              )}
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
