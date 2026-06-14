"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  formatEstimate,
  parseEstimate,
} from "@/lib/constants/project-options";

export interface EstimateInputProps {
  /** Current estimate in whole minutes, or null when unset. */
  value: number | null;
  /** Fires with the parsed minutes (or null to clear) on commit. */
  onChange: (minutes: number | null) => void;
  disabled?: boolean;
  /** Input height — "sm" (h-8) or "default" (h-9). */
  size?: "sm" | "default";
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Estimate field that takes whole MINUTES in/out but speaks human to the user:
 * it shows "2h 30m" while idle and accepts free text ("90m", "1.5h", "150") on
 * focus, parsing to minutes on Enter/blur (spec §4.2). Inline validation marks
 * unparseable text invalid and reverts on commit rather than emitting garbage —
 * Esc also cancels. Used by the sheet's Estimate row and the table cell.
 */
export function EstimateInput({
  value,
  onChange,
  disabled,
  size = "sm",
  placeholder = "e.g. 2h 30m",
  className,
  "aria-label": ariaLabel = "Estimate",
}: EstimateInputProps) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);

  // The parsed value of the current draft (null = empty/clear is allowed).
  const draftMinutes = React.useMemo(
    () => (text.trim() ? parseEstimate(text) : null),
    [text],
  );
  const draftInvalid = text.trim().length > 0 && draftMinutes === null;

  function beginEdit() {
    if (disabled) return;
    setText(value != null ? formatEstimate(value) : "");
    setInvalid(false);
    setEditing(true);
  }

  function commit() {
    // Reject unparseable text: keep the prior value, surface the error briefly.
    if (draftInvalid) {
      setInvalid(true);
      return;
    }
    onChange(draftMinutes);
    setEditing(false);
    setInvalid(false);
  }

  function cancel() {
    setEditing(false);
    setInvalid(false);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        aria-label={ariaLabel}
        aria-invalid={draftInvalid || invalid}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={cn(
          "tabular-nums",
          size === "sm" ? "h-8" : "h-9",
          className,
        )}
      />
    );
  }

  const display = formatEstimate(value);
  const isSet = value != null && value > 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={beginEdit}
      aria-label={`${ariaLabel}: ${isSet ? display : "not set"}. Click to edit.`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 text-sm tabular-nums transition-colors duration-150 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8" : "h-9",
        !isSet && "text-muted-foreground",
        className,
      )}
    >
      <Timer className="size-3.5 text-muted-foreground" aria-hidden />
      {isSet ? display : placeholder}
    </button>
  );
}
