"use client";

import * as React from "react";
import { Briefcase, ChevronDown, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSession } from "@/app/(app)/session-context";
import {
  useThread,
  useThreadMessages,
  useSendMessage,
  useTypingIndicator,
  useUpdateThread,
} from "@/hooks/use-messages";
import type { ThreadStatus } from "@/lib/api/types";
import { ParticipantAvatars } from "./participant-avatars";
import { MessageList } from "./message-list";
import { Composer } from "./composer";

const STATUS_OPTIONS: { value: ThreadStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "awaiting", label: "Awaiting" },
  { value: "closed", label: "Closed" },
];

const STATUS_STYLE: Record<ThreadStatus, string> = {
  open: "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary",
  awaiting:
    "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-accent-foreground",
  closed: "bg-muted text-muted-foreground",
};

function StatusChanger({ threadId, status }: { threadId: string; status: ThreadStatus }) {
  const update = useUpdateThread(threadId);
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80",
            STATUS_STYLE[status],
          )}
        >
          {label}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Set status
        </DropdownMenuLabel>
        {STATUS_OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => {
              if (o.value !== status) update.mutate({ status: o.value });
            }}
          >
            <Badge
              variant="outline"
              className={cn("border-0", STATUS_STYLE[o.value])}
            >
              {o.label}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ConversationPane({ threadId }: { threadId: string }) {
  const session = useSession();
  const { data: thread, isLoading: threadLoading } = useThread(threadId);
  const {
    data: messages,
    isLoading: messagesLoading,
  } = useThreadMessages(threadId);
  const { send, emitTyping } = useSendMessage(threadId);
  const typingNames = useTypingIndicator(threadId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b bg-[var(--card)] px-4 py-3 md:px-6">
        {threadLoading || !thread ? (
          <Skeleton className="h-6 w-48" />
        ) : (
          <>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="truncate font-display text-base font-semibold leading-tight">
                {thread.subject}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>
                  {thread.participants.length} participant
                  {thread.participants.length === 1 ? "" : "s"}
                </span>
                {thread.clientName && (
                  <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
                    <Users className="size-2.5" />
                    {thread.clientName}
                  </span>
                )}
                {thread.projectName && (
                  <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-1.5 py-0.5 font-medium text-accent-foreground">
                    <Briefcase className="size-2.5" />
                    {thread.projectName}
                  </span>
                )}
              </div>
            </div>
            <ParticipantAvatars
              participants={thread.participants}
              max={4}
              size="default"
            />
            <StatusChanger threadId={threadId} status={thread.status} />
          </>
        )}
      </div>

      {/* Messages */}
      {messagesLoading ? (
        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 py-4 md:px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "h-12 rounded-2xl",
                i % 2 === 0 ? "w-2/3 self-start" : "w-1/2 self-end",
              )}
            />
          ))}
        </div>
      ) : (
        <MessageList
          messages={messages ?? []}
          currentUserId={session.user.id}
          typingNames={typingNames}
        />
      )}

      {/* Composer */}
      <Composer onSend={send} onType={emitTyping} />
    </div>
  );
}

export function ConversationEmpty({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        <Users className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold">
          Select a conversation
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Choose a thread from the list, or start a new one to message your
          team in real time.
        </p>
      </div>
      <Button onClick={onNew} className="mt-1">
        New thread
      </Button>
    </div>
  );
}
