"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export interface TaskDescriptionInlineProps {
  value: string | null | undefined;
  /** Fires with the next description (autosave on blur) only when it changes. */
  onSave: (next: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Click-to-edit task description (spec §4.1). Idle, it shows the existing
 * description as soft body text, or a muted "Add a description…" affordance when
 * empty. Clicking opens an auto-growing textarea that autosaves on blur;
 * Cmd/Ctrl+Enter commits, Esc cancels. Storing "" clears the field.
 */
export function TaskDescriptionInline({
  value,
  onSave,
  disabled,
  className,
}: TaskDescriptionInlineProps) {
  const current = value ?? "";
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(current);

  React.useEffect(() => {
    if (!editing) setDraft(current);
  }, [current, editing]);

  function begin() {
    if (disabled) return;
    setDraft(current);
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next !== current.trim()) onSave(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(current);
    setEditing(false);
  }

  if (editing) {
    return (
      <Textarea
        autoFocus
        aria-label="Task description"
        placeholder="Add a description…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={cn("min-h-24 text-sm", className)}
      />
    );
  }

  if (!current.trim()) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={begin}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md border border-dashed px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        <Plus className="size-3.5 shrink-0" aria-hidden />
        Add a description…
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={begin}
      aria-label="Edit description"
      className={cn(
        "-mx-2 block w-[calc(100%+1rem)] whitespace-pre-wrap rounded-md px-2 py-1.5 text-left text-sm leading-relaxed text-foreground/90 transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
        className,
      )}
    >
      {current}
    </button>
  );
}
