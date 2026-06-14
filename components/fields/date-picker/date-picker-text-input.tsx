"use client";

import * as React from "react";
import { format } from "date-fns";
import { CornerDownLeft, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isOutsideRange, parseNaturalDate } from "./date-picker.utils";

interface DatePickerTextInputProps {
  today: Date;
  fromDate?: Date;
  toDate?: Date;
  placeholder?: string;
  /** Commit a successfully-parsed date and close the popover. */
  onCommit: (date: Date) => void;
  /**
   * Live-preview the parsed date so the calendar can echo the navigation while
   * the user is still typing (without committing).
   */
  onPreview?: (date: Date | null) => void;
  className?: string;
}

/**
 * Natural-language date entry per spec §5. Parses on Enter/blur via
 * `parseNaturalDate`, shows a live resolved-date hint while typing, and surfaces
 * inline validation (not color-only — an icon + words) when the text or the
 * resolved date is out of range. Commits + closes on Enter when valid.
 */
export function DatePickerTextInput({
  today,
  fromDate,
  toDate,
  placeholder = "Type a date — e.g. next friday, in 3 days",
  onCommit,
  onPreview,
  className,
}: DatePickerTextInputProps) {
  const [text, setText] = React.useState("");
  const hintId = React.useId();

  const parsed = React.useMemo(
    () => (text.trim() ? parseNaturalDate(text, today) : null),
    [text, today],
  );
  const outOfRange =
    parsed !== null && isOutsideRange(parsed, fromDate, toDate);
  const unparsable = text.trim().length > 0 && parsed === null;
  const valid = parsed !== null && !outOfRange;

  // Echo the in-progress parse up to the calendar (preview only, no commit).
  React.useEffect(() => {
    onPreview?.(valid ? parsed : null);
  }, [valid, parsed, onPreview]);

  const tryCommit = () => {
    if (valid && parsed) {
      onCommit(parsed);
      setText("");
    }
  };

  let hint: React.ReactNode;
  if (valid && parsed) {
    hint = (
      <span className="inline-flex items-center gap-1 text-primary">
        <Sparkles className="size-3" aria-hidden />
        {format(parsed, "EEE, d MMM yyyy")}
        <kbd className="ml-1 inline-flex items-center gap-0.5 rounded border bg-muted px-1 font-sans text-[0.65rem] text-muted-foreground">
          <CornerDownLeft className="size-2.5" aria-hidden /> Enter
        </kbd>
      </span>
    );
  } else if (outOfRange) {
    hint = (
      <span className="text-destructive">
        That date is outside the allowed range
      </span>
    );
  } else if (unparsable) {
    hint = (
      <span className="text-muted-foreground">
        Try “tomorrow”, “next monday”, “in 2 weeks”, or “25 Dec”
      </span>
    );
  } else {
    hint = (
      <span className="text-muted-foreground">
        Type a date, then press Enter
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Input
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        aria-label="Type a date"
        aria-describedby={hintId}
        aria-invalid={outOfRange || unparsable || undefined}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            tryCommit();
          }
        }}
        onBlur={tryCommit}
        className="h-9"
      />
      <p
        id={hintId}
        aria-live="polite"
        className="min-h-4 px-0.5 text-xs tabular-nums"
      >
        {hint}
      </p>
    </div>
  );
}
