"use client";

import * as React from "react";
import { Ban } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A small themed swatch palette. The first entries lean pine/brass so colors
 * sit naturally in the evergreen theme, followed by a broad practical spread.
 */
export const SWATCHES: string[] = [
  "#1f5f4e", // primary pine
  "#2e8b6b",
  "#6ba98f",
  "#b08534", // accent brass
  "#c9a24e",
  "#8c6a3c",
  "#4e6e5d",
  "#3f7d5a",
  "#16201c", // ink
  "#6a5752",
  "#b3362f", // red
  "#d9822b", // orange
  "#b8860b", // amber
  "#2f6f4f", // green
  "#2563a8", // blue
  "#5b3b8c", // purple
  "#ffffff",
  "#f1eae5",
  "#e6dad1",
  "#000000",
];

export function ColorPopover({
  trigger,
  value,
  onChange,
  onReset,
  resetLabel = "Reset",
  align = "start",
}: {
  trigger: React.ReactNode;
  value?: string;
  onChange: (color: string) => void;
  onReset: () => void;
  resetLabel?: string;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-56 p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={cn(
                "size-6 rounded-md border border-border/60 transition-transform hover:scale-110",
                value?.toLowerCase() === c.toLowerCase() &&
                  "ring-2 ring-ring ring-offset-1 ring-offset-popover",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="color"
              value={value ?? "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="size-7 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"
            />
            Custom
          </label>
          <button
            type="button"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
          >
            <Ban className="size-3.5" /> {resetLabel}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
