import * as React from "react";
import { UserRound } from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface AssigneeAvatarProps {
  /** Assignee display name; null/empty renders the unassigned placeholder. */
  name?: string | null;
  /** Optional avatar image URL. */
  avatarUrl?: string | null;
  /** Avatar diameter. */
  size?: "sm" | "default" | "lg";
  /** Render the name next to the avatar. */
  showName?: boolean;
  /** Label shown (and read by SRs) when there is no assignee. */
  unassignedLabel?: string;
  className?: string;
}

/**
 * Shared assignee chip — initials/photo avatar with an optional name (spec §4.2).
 * Falls back to a muted "unassigned" person glyph so an empty assignee is
 * always legible (never a blank circle). Used by cards, list/table rows and the
 * sheet's assignee row so every assignee reads the same.
 */
export function AssigneeAvatar({
  name,
  avatarUrl,
  size = "sm",
  showName = false,
  unassignedLabel = "Unassigned",
  className,
}: AssigneeAvatarProps) {
  const hasAssignee = !!name && name.trim().length > 0;
  const display = hasAssignee ? name!.trim() : unassignedLabel;

  return (
    <span
      data-slot="assignee-avatar"
      className={cn("inline-flex items-center gap-2", className)}
      title={display}
    >
      <Avatar size={size} className={cn(!hasAssignee && "bg-muted")}>
        {hasAssignee && avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={display} />
        ) : null}
        <AvatarFallback
          className={cn(!hasAssignee && "text-muted-foreground")}
        >
          {hasAssignee ? (
            initials(display)
          ) : (
            <UserRound className="size-3.5" aria-hidden />
          )}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span
          className={cn(
            "truncate text-sm",
            !hasAssignee && "text-muted-foreground",
          )}
        >
          {display}
        </span>
      )}
      {!showName && <span className="sr-only">{display}</span>}
    </span>
  );
}
