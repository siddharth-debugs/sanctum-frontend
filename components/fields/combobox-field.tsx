"use client";

import * as React from "react";
import type { FieldValues } from "react-hook-form";
import { Check, ChevronsUpDown, X } from "lucide-react";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BaseFieldProps, RequiredMark } from "./field-context";

export interface ComboOption {
  label: string;
  value: string;
}

export interface ComboboxFieldProps<T extends FieldValues>
  extends BaseFieldProps<T> {
  options: ComboOption[];
  multiple?: boolean;
  emptyText?: string;
  searchPlaceholder?: string;
  /** Show an inline clear (×) on a single-select with a value. Default true. */
  clearable?: boolean;
  onSearch?: (q: string) => void;
}

export function ComboboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "Select…",
  disabled,
  required,
  options,
  multiple,
  emptyText = "No results.",
  searchPlaceholder = "Search…",
  clearable = true,
  onSearch,
  className,
}: ComboboxFieldProps<T>) {
  const [open, setOpen] = React.useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected: string[] = multiple
          ? Array.isArray(field.value)
            ? field.value
            : []
          : field.value
            ? [field.value]
            : [];

        const toggle = (val: string) => {
          if (multiple) {
            const next = selected.includes(val)
              ? selected.filter((v) => v !== val)
              : [...selected, val];
            field.onChange(next);
          } else {
            field.onChange(val === field.value ? "" : val);
            setOpen(false);
          }
        };

        const labelFor = (v: string) =>
          options.find((o) => o.value === v)?.label ?? v;

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
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                      "h-11 w-full justify-between font-normal",
                      selected.length === 0 && "text-muted-foreground",
                    )}
                  >
                    <span className="flex flex-1 flex-wrap gap-1 overflow-hidden text-left">
                      {selected.length === 0
                        ? placeholder
                        : multiple
                          ? selected.map((v) => (
                              <span
                                key={v}
                                className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                              >
                                {labelFor(v)}
                                <X
                                  className="size-3 opacity-60"
                                  onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggle(v);
                                  }}
                                />
                              </span>
                            ))
                          : labelFor(selected[0])}
                    </span>
                    {!multiple && selected.length > 0 && clearable && !disabled ? (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label="Clear selection"
                        className="ml-2 grid size-5 shrink-0 place-items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          field.onChange("");
                        }}
                      >
                        <X className="size-3.5" />
                      </span>
                    ) : (
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={searchPlaceholder}
                    onValueChange={onSearch}
                  />
                  <CommandList>
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandGroup>
                      {options.map((o) => (
                        <CommandItem
                          key={o.value}
                          value={o.label}
                          onSelect={() => toggle(o.value)}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              selected.includes(o.value)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {o.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
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
