"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, MessagesSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatClockTime, formatDayLabel } from "@/lib/relative-time";
import { portalApi } from "@/lib/api/portal-client";
import { ApiError } from "@/lib/api/client";
import type { PostComment } from "@/lib/api/types";

/** Build the query key for a post's thread — shared with the page's socket refetch. */
export function threadKey(token: string, postId: string) {
  return ["portal", token, postId, "comments"] as const;
}

/** Lightweight count hook so feed items can badge a thread without rendering it. */
export function useThreadCount(token: string, postId: string, enabled: boolean) {
  const { data } = useQuery({
    queryKey: threadKey(token, postId),
    queryFn: () => portalApi.comments(token, postId),
    enabled,
  });
  return data?.length ?? 0;
}

/**
 * Conversation panel for one post — a Sheet that docks to the bottom on mobile
 * and the right edge on desktop. Chat-style, oldest -> newest, with clear client
 * vs. agency attribution and a composer so the client can reply. New comments
 * arrive live via the page-level socket refetch (same query key).
 */
export function PortalComments({
  open,
  onOpenChange,
  token,
  postId,
  actorLabel,
  agencyName,
  brand,
  canComment,
  captionPreview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  postId: string;
  actorLabel: string;
  agencyName: string;
  brand: string;
  canComment: boolean;
  captionPreview?: string | null;
}) {
  const qc = useQueryClient();
  const key = threadKey(token, postId);
  const { data: comments, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => portalApi.comments(token, postId),
    enabled: open,
  });

  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Keep the thread pinned to the newest message as it grows / opens.
  React.useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, comments?.length]);

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await portalApi.comment(token, postId, body, actorLabel);
      setText("");
      await qc.invalidateQueries({ queryKey: key });
      toast.success("Comment sent to the team");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't send your comment",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="portal-root flex h-[82dvh] flex-col gap-0 rounded-t-2xl p-0 sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl"
      >
        <SheetHeader className="border-b px-4 py-3.5 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MessagesSquare className="size-4.5 text-[var(--portal-brand)]" />
            Discussion
          </SheetTitle>
          {captionPreview && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {captionPreview}
            </p>
          )}
        </SheetHeader>

        {/* Thread */}
        <div ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="grid h-full place-items-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : !comments?.length ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <div className="space-y-1.5">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--portal-brand)_14%,transparent)] text-[var(--portal-brand)]">
                  <MessagesSquare className="size-6" />
                </span>
                <p className="text-sm font-medium">Start the conversation</p>
                <p className="text-xs text-muted-foreground">
                  Questions or tweaks? Leave a note — {agencyName} gets it instantly.
                </p>
              </div>
            </div>
          ) : (
            <Thread comments={comments} agencyName={agencyName} brand={brand} />
          )}
        </div>

        {/* Composer */}
        {canComment ? (
          <div className="border-t bg-background/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <div className="flex items-end gap-2">
              <Textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (!e.shiftKey && e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={`Reply to ${agencyName}…`}
                aria-label="Write a comment"
                className="max-h-32 min-h-11 resize-none rounded-xl text-sm"
              />
              <Button
                type="button"
                size="icon"
                aria-label="Send comment"
                disabled={sending || !text.trim()}
                onClick={submit}
                className="size-11 shrink-0 rounded-xl"
                style={{ background: brand }}
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            <p className="mt-1.5 flex items-center gap-1 px-0.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3 text-success" />
              Sending as {actorLabel}
            </p>
          </div>
        ) : (
          <div className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
            Comments are read-only on this link.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** The chat list itself — day separators, attribution chips, tabular times. */
function Thread({
  comments,
  agencyName,
  brand,
}: {
  comments: PostComment[];
  agencyName: string;
  brand: string;
}) {
  let lastDay = "";
  return (
    <ul className="space-y-3">
      {comments.map((c) => {
        const mine = c.authorType === "client";
        const name = mine ? c.authorName || "You" : agencyName;
        const day = formatDayLabel(c.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        return (
          <React.Fragment key={c.id}>
            {showDay && (
              <li className="flex justify-center py-1">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {day}
                </span>
              </li>
            )}
            <li className={cn("flex gap-2", mine && "flex-row-reverse")}>
              <span
                className={cn(
                  "mt-auto grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  mine ? "text-white" : "bg-secondary text-secondary-foreground ring-1 ring-border",
                )}
                style={mine ? { background: brand } : undefined}
                aria-hidden
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
              <div className={cn("min-w-0 max-w-[78%]", mine && "items-end text-right")}>
                <div
                  className={cn(
                    "mb-0.5 flex items-center gap-1.5 text-[11px]",
                    mine && "flex-row-reverse",
                  )}
                >
                  <span className="font-semibold text-foreground/80">{name}</span>
                  <span
                    className={cn(
                      "rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide",
                      mine
                        ? "bg-[color-mix(in_srgb,var(--portal-brand)_16%,transparent)] text-[var(--portal-brand)]"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {mine ? "You" : "Team"}
                  </span>
                </div>
                <div
                  className={cn(
                    "inline-block whitespace-pre-line break-words rounded-2xl px-3 py-2 text-left text-sm leading-relaxed shadow-sm",
                    mine
                      ? "rounded-br-md text-white"
                      : "rounded-bl-md bg-secondary text-foreground",
                  )}
                  style={mine ? { background: brand } : undefined}
                >
                  {c.body}
                </div>
                <p className="mt-0.5 px-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {formatClockTime(c.createdAt)}
                </p>
              </div>
            </li>
          </React.Fragment>
        );
      })}
    </ul>
  );
}
