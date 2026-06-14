"use client";

import * as React from "react";
import { Columns3, List, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** The three task views (spec §4.2). */
export type TaskView = "board" | "list" | "table";

interface ViewMeta {
  value: TaskView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TASK_VIEWS: ViewMeta[] = [
  { value: "board", label: "Board", icon: Columns3 },
  { value: "list", label: "List", icon: List },
  { value: "table", label: "Table", icon: Table2 },
];

export interface ViewSwitcherProps {
  value: TaskView;
  onChange: (view: TaskView) => void;
  /** Hide the text labels and show icons only (narrow toolbars / mobile). */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Segmented Board / List / Table switcher (spec §4.2). A radiogroup of 44px-tall
 * buttons with an animated-feel active state (`bg-card` + shadow over a muted
 * track). Each option carries an icon AND a label so the active view is never
 * communicated by colour alone; arrow keys move between options.
 */
export function ViewSwitcher({
  value,
  onChange,
  iconOnly = false,
  className,
}: ViewSwitcherProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (index + dir + TASK_VIEWS.length) % TASK_VIEWS.length;
    refs.current[next]?.focus();
    onChange(TASK_VIEWS[next].value);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Task view"
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-md bg-muted/60 p-1",
        className,
      )}
    >
      {TASK_VIEWS.map((v, i) => {
        const active = v.value === value;
        const Icon = v.icon;
        return (
          <button
            key={v.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={v.label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(v.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {!iconOnly && v.label}
          </button>
        );
      })}
    </div>
  );
}
