"use client";

import * as React from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Auto-growing message composer. Enter sends, Shift+Enter inserts a newline.
 * Calls `onType` (debounced upstream) on every change for typing indicators.
 */
export function Composer({
  onSend,
  onType,
  disabled,
}: {
  onSend: (body: string) => void;
  onType?: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState("");

  const submit = () => {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 border-t bg-[var(--card)] p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onType?.();
          }}
          onKeyDown={onKeyDown}
          placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
          rows={1}
          disabled={disabled}
          className="max-h-40 min-h-10 resize-none"
        />
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="size-10 shrink-0"
          aria-label="Send message"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
