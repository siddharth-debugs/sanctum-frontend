"use client";

import * as React from "react";
import { Check, FileText, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, initials, formatBytes } from "@/lib/utils";
import { formatClockTime, formatDayLabel } from "@/lib/relative-time";
import { useEditMessage, useDeleteMessage } from "@/hooks/use-messages";
import type { Message, MessageAttachment } from "@/lib/api/types";

interface Group {
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  own: boolean;
  messages: Message[];
}

interface DaySection {
  dayKey: string;
  label: string;
  groups: Group[];
}

/** Group consecutive messages by sender, split into day sections. */
function buildSections(messages: Message[], currentUserId: string): DaySection[] {
  const sections: DaySection[] = [];

  // Safety net: never render the same message id twice. A transient duplicate
  // from the optimistic-send + socket-echo race would otherwise throw React's
  // "two children with the same key" error.
  const seen = new Set<string>();
  const unique = messages.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  for (const m of unique) {
    const day = new Date(m.createdAt);
    const dayKey = Number.isNaN(day.getTime())
      ? "unknown"
      : day.toISOString().slice(0, 10);

    let section = sections[sections.length - 1];
    if (!section || section.dayKey !== dayKey) {
      section = { dayKey, label: formatDayLabel(m.createdAt), groups: [] };
      sections.push(section);
    }

    const last = section.groups[section.groups.length - 1];
    if (last && last.senderId === m.senderId) {
      last.messages.push(m);
    } else {
      section.groups.push({
        senderId: m.senderId,
        senderName: m.senderName,
        senderAvatarUrl: m.senderAvatarUrl,
        own: m.senderId === currentUserId,
        messages: [m],
      });
    }
  }

  return sections;
}

/** Inline image grid + non-image file chips for a message's attachments. */
function Attachments({
  attachments,
  own,
}: {
  attachments: MessageAttachment[];
  own: boolean;
}) {
  if (!attachments.length) return null;
  const images = attachments.filter((a) => a.type === "image");
  const files = attachments.filter((a) => a.type !== "image");

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-1.5",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {images.map((a, i) => (
            <a
              key={`${a.url}-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.name}
                className="max-h-60 w-full rounded-lg object-cover transition-opacity hover:opacity-90"
              />
            </a>
          ))}
        </div>
      )}
      {files.map((a, i) => (
        <a
          key={`${a.url}-${i}`}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
            own
              ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/20"
              : "border-border bg-background/60 hover:bg-background",
          )}
        >
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-md",
              own
                ? "bg-primary-foreground/15"
                : "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary",
            )}
          >
            <FileText className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block max-w-[180px] truncate font-medium">
              {a.name}
            </span>
            {a.bytes != null && (
              <span
                className={cn(
                  "block text-[10px]",
                  own ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {formatBytes(a.bytes)}
              </span>
            )}
          </span>
        </a>
      ))}
    </div>
  );
}

/** A single message bubble: body + attachments, plus an own-message ⋯ menu. */
function MessageBubble({
  message,
  own,
  threadId,
}: {
  message: Message;
  own: boolean;
  threadId: string;
}) {
  const edit = useEditMessage(threadId);
  const del = useDeleteMessage(threadId);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(message.body);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const startEdit = () => {
    setDraft(message.body);
    setEditing(true);
  };

  const saveEdit = () => {
    const body = draft.trim();
    if (!body || body === message.body) {
      setEditing(false);
      return;
    }
    edit.mutate(
      { messageId: message.id, body },
      { onSuccess: () => setEditing(false) },
    );
  };

  const onEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
  };

  const attachments = message.attachments ?? [];
  // Allow the ⋯ menu only on real (acked) own messages.
  const canManage = own && !message.pending && !message.id.startsWith("tmp_");

  return (
    <div
      className={cn(
        "group/bubble relative flex items-end gap-1",
        own ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex max-w-full flex-col rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
          own
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-[var(--muted)] text-foreground",
          message.pending && "opacity-60",
        )}
      >
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onEditKeyDown}
              rows={2}
              autoFocus
              className="min-h-12 w-[min(60vw,320px)] resize-none bg-background text-foreground"
            />
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setEditing(false)}
                aria-label="Cancel edit"
              >
                <X className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="size-7"
                onClick={saveEdit}
                disabled={edit.isPending}
                aria-label="Save edit"
              >
                <Check className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {message.body && (
              <span className="whitespace-pre-wrap break-words">
                {message.body}
              </span>
            )}
            <Attachments attachments={attachments} own={own} />
            <span
              className={cn(
                "mt-0.5 self-end text-[10px]",
                own ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {message.pending ? "Sending…" : formatClockTime(message.createdAt)}
              {message.editedAt ? " · edited" : ""}
            </span>
          </>
        )}
      </div>

      {canManage && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mb-1 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus:opacity-100 group-hover/bubble:opacity-100"
              aria-label="Message actions"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={own ? "end" : "start"} className="w-36">
            <DropdownMenuItem onClick={startEdit}>
              <Pencil className="size-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>
              This permanently removes the message for everyone in the thread.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={del.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                del.mutate(message.id, {
                  onSuccess: () => setConfirmDelete(false),
                })
              }
              disabled={del.isPending}
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MessageList({
  messages,
  currentUserId,
  typingNames,
  threadId,
}: {
  messages: Message[];
  currentUserId: string;
  typingNames: string[];
  threadId: string;
}) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message (and when someone starts typing).
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typingNames.length]);

  const sections = React.useMemo(
    () => buildSections(messages, currentUserId),
    [messages, currentUserId],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:px-6">
      {sections.map((section) => (
        <div key={section.dayKey} className="flex flex-col gap-3">
          <div className="sticky top-0 z-10 flex justify-center">
            <span className="rounded-full bg-[color-mix(in_srgb,var(--muted)_85%,transparent)] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
              {section.label}
            </span>
          </div>

          {section.groups.map((group, gi) => (
            <div
              key={`${group.senderId}-${gi}`}
              className={cn(
                "flex items-end gap-2",
                group.own ? "flex-row-reverse" : "flex-row",
              )}
            >
              {!group.own && (
                <Avatar size="sm" className="mb-0.5 shrink-0">
                  {group.senderAvatarUrl ? (
                    <AvatarImage
                      src={group.senderAvatarUrl}
                      alt={group.senderName}
                    />
                  ) : null}
                  <AvatarFallback
                    className="text-[10px] font-semibold text-primary-foreground"
                    style={{
                      background:
                        "linear-gradient(135deg,var(--primary),var(--accent))",
                    }}
                  >
                    {initials(group.senderName)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  "flex max-w-[78%] flex-col gap-1",
                  group.own ? "items-end" : "items-start",
                )}
              >
                {!group.own && (
                  <span className="px-1 text-[11px] font-medium text-muted-foreground">
                    {group.senderName}
                  </span>
                )}
                {group.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    own={group.own}
                    threadId={threadId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {typingNames.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <span className="flex gap-1">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </span>
          {typingNames.length === 1
            ? `${typingNames[0]} is typing…`
            : `${typingNames.length} people are typing…`}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
