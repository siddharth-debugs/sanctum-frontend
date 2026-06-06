"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Baseline,
  PaintBucket,
  Eraser,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CellStyle, NumberFormat } from "@/lib/api/types";
import { ColorPopover } from "./color-popover";

type Align = NonNullable<CellStyle["a"]>;

export interface SheetToolbarProps {
  /** The active cell's effective style (drives pressed states). */
  active: CellStyle;
  onToggle: (key: "b" | "i" | "u") => void;
  onAlign: (a: Align) => void;
  onColor: (color: string | undefined) => void;
  onBg: (color: string | undefined) => void;
  onFormat: (fmt: NumberFormat) => void;
  onClearFormatting: () => void;
  disabled?: boolean;
}

function ToolButton({
  pressed,
  onClick,
  label,
  children,
  disabled,
}: {
  pressed?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-pressed={pressed}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()} // keep grid selection
          onClick={onClick}
          className={cn(
            "text-muted-foreground",
            pressed &&
              "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const FORMAT_OPTIONS: { value: NumberFormat; label: string }[] = [
  { value: "general", label: "General" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
];

export function SheetToolbar({
  active,
  onToggle,
  onAlign,
  onColor,
  onBg,
  onFormat,
  onClearFormatting,
  disabled,
}: SheetToolbarProps) {
  const align: Align = active.a ?? "left";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b bg-[var(--glass-bg)] px-2 py-1.5 backdrop-blur-[var(--glass-blur)]">
        <ToolButton
          label="Bold"
          pressed={!!active.b}
          disabled={disabled}
          onClick={() => onToggle("b")}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label="Italic"
          pressed={!!active.i}
          disabled={disabled}
          onClick={() => onToggle("i")}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          label="Underline"
          pressed={!!active.u}
          disabled={disabled}
          onClick={() => onToggle("u")}
        >
          <Underline />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolButton
          label="Align left"
          pressed={align === "left"}
          disabled={disabled}
          onClick={() => onAlign("left")}
        >
          <AlignLeft />
        </ToolButton>
        <ToolButton
          label="Align center"
          pressed={align === "center"}
          disabled={disabled}
          onClick={() => onAlign("center")}
        >
          <AlignCenter />
        </ToolButton>
        <ToolButton
          label="Align right"
          pressed={align === "right"}
          disabled={disabled}
          onClick={() => onAlign("right")}
        >
          <AlignRight />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ColorPopover
          value={active.color}
          onChange={(c) => onColor(c)}
          onReset={() => onColor(undefined)}
          resetLabel="Default"
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              title="Text color"
              className="relative text-muted-foreground"
            >
              <Baseline />
              <span
                className="absolute inset-x-1.5 bottom-1 h-[3px] rounded-full"
                style={{ backgroundColor: active.color ?? "currentColor" }}
              />
            </Button>
          }
        />
        <ColorPopover
          value={active.bg}
          onChange={(c) => onBg(c)}
          onReset={() => onBg(undefined)}
          resetLabel="No fill"
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              title="Fill color"
              className="relative text-muted-foreground"
            >
              <PaintBucket />
              <span
                className="absolute inset-x-1.5 bottom-1 h-[3px] rounded-full border border-border/40"
                style={{ backgroundColor: active.bg ?? "transparent" }}
              />
            </Button>
          }
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Select
          value={active.fmt ?? "general"}
          onValueChange={(v) => onFormat(v as NumberFormat)}
          disabled={disabled}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-32"
            onMouseDown={(e) => e.preventDefault()}
          >
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolButton
          label="Clear formatting"
          disabled={disabled}
          onClick={onClearFormatting}
        >
          <Eraser />
        </ToolButton>
      </div>
    </TooltipProvider>
  );
}
