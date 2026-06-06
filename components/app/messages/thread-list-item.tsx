"use client";

import { Briefcase, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type { ThreadSummary } from "@/lib/api/types";
import { ParticipantAvatars } from "./participant-avatars";

export function ThreadListItem({
  thread,
  active,
  onSelect,
}: {
  thread: ThreadSummary;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const hasUnread = thread.unreadCount > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      className={cn(
        "flex w-full flex-col gap-1.5 border-b border-border/60 px-4 py-3 text-left transition-colors",
        active
          ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]"
          : "hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]",
      )}
    >
      <div className="flex items-center gap-2">
        <ParticipantAvatars participants={thread.participants} max={3} />
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-display text-sm leading-tight",
            hasUnread ? "font-semibold text-foreground" : "font-medium",
          )}
        >
          {thread.subject}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatRelativeTime(thread.lastMessageAt ?? thread.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-xs",
            hasUnread ? "text-foreground/80" : "text-muted-foreground",
          )}
        >
          {thread.lastMessagePreview || "No messages yet"}
        </p>
        {hasUnread && (
          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
            {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
          </span>
        )}
      </div>

      {(thread.clientName || thread.projectName) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {thread.clientName && (
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
              <Users className="size-2.5" />
              {thread.clientName}
            </span>
          )}
          {thread.projectName && (
            <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
              <Briefcase className="size-2.5" />
              {thread.projectName}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
