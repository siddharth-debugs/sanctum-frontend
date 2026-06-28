"use client";

import * as React from "react";
import { Loader2, Paperclip, SendHorizontal, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatBytes } from "@/lib/utils";
import {
  uploadMessageAttachment,
  type UploadedAttachment,
} from "@/lib/cloudinary";
import type { MessageAttachment } from "@/lib/api/types";

interface PendingAttachment extends UploadedAttachment {
  /** Stable key for the preview list. */
  key: string;
}

/**
 * Auto-growing message composer. Enter sends, Shift+Enter inserts a newline.
 * Calls `onType` (debounced upstream) on every change for typing indicators.
 * A paperclip uploads images/files to Cloudinary and includes them in the send.
 */
export function Composer({
  onSend,
  onSendWithAttachments,
  onType,
  disabled,
}: {
  onSend: (body: string) => void;
  /** Send a message carrying ≥1 attachment (posted via REST upstream). */
  onSendWithAttachments?: (
    body: string,
    attachments: MessageAttachment[],
  ) => Promise<void> | void;
  onType?: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState("");
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const busy = disabled || uploading || sending;
  const canSend = !busy && (!!value.trim() || attachments.length > 0);

  const submit = async () => {
    const body = value.trim();
    if (uploading || sending) return;
    if (!body && attachments.length === 0) return;

    if (attachments.length > 0 && onSendWithAttachments) {
      setSending(true);
      try {
        await onSendWithAttachments(
          body,
          attachments.map(({ key: _key, ...a }) => a),
        );
        setValue("");
        setAttachments([]);
      } catch {
        toast.error("Couldn't send the attachment. Please retry.");
      } finally {
        setSending(false);
      }
      return;
    }

    if (!body) return;
    onSend(body);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadMessageAttachment(file);
        setAttachments((prev) => [
          ...prev,
          {
            ...uploaded,
            key: `${file.name}_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 7)}`,
          },
        ]);
      }
    } catch {
      toast.error("Upload failed. Please retry.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAttachment = (key: string) =>
    setAttachments((prev) => prev.filter((a) => a.key !== key));

  return (
    <div className="shrink-0 border-t bg-[var(--card)] p-3">
      {/* Pending attachment previews */}
      {(attachments.length > 0 || uploading) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div
              key={a.key}
              className="group relative flex items-center gap-2 rounded-lg border bg-[var(--muted)] p-1.5 pr-7"
            >
              {a.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt={a.name}
                  className="size-10 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
                  <Paperclip className="size-4" />
                </span>
              )}
              <div className="min-w-0 max-w-[140px]">
                <p className="truncate text-xs font-medium">{a.name}</p>
                {a.bytes != null && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(a.bytes)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(a.key)}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Remove ${a.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="flex size-[52px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {onSendWithAttachments && (
          <>
            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              onChange={(e) => void onPick(e.target.files)}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="size-10 shrink-0"
              aria-label="Attach a file"
            >
              <Paperclip className="size-4" />
            </Button>
          </>
        )}
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
          onClick={() => void submit()}
          disabled={!canSend}
          className={cn("size-10 shrink-0")}
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
