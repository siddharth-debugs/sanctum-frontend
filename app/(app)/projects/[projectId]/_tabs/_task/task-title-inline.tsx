"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TaskTitleInlineProps {
  value: string;
  /** Fires with the trimmed next title once it actually changes. */
  onSave: (next: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Click-to-edit task title (spec §4.1 sticky header). Idle, it reads as a bold
 * heading; clicking (or focusing + Enter) swaps in an auto-growing textarea.
 * Cmd/Ctrl+Enter or blur commits, Esc cancels. Empty titles are rejected inline
 * (revert to the prior value) so a task can never lose its name. The same
 * keyboard contract is reused by the description editor below it.
 */
export function TaskTitleInline({
  value,
  onSave,
  disabled,
  className,
}: TaskTitleInlineProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  // Keep the draft in sync when the upstream value changes while idle.
  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function begin() {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        autoFocus
        rows={1}
        aria-label="Task title"
        aria-invalid={draft.trim().length === 0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={cn(
          "field-sizing-content w-full resize-none rounded-md bg-transparent px-1.5 py-0.5 text-lg font-semibold leading-snug outline-none ring-2 ring-ring",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={begin}
      aria-label={`Task title: ${value}. Click to edit.`}
      className={cn(
        "-mx-1.5 w-full rounded-md px-1.5 py-0.5 text-left text-lg font-semibold leading-snug transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
        className,
      )}
    >
      {value}
    </button>
  );
}
