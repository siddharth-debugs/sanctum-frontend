import * as React from "react";
import { UserRound } from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProjectTask } from "@/lib/api/types";

/** One person rendered in the stack. */
export interface AssigneeStackPerson {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * Resolve a task's assignees for display: prefer the full `assignees` set, and
 * fall back to the legacy single `assigneeId` / `assigneeName` when the array is
 * absent (older cached rows / bare POST·PATCH responses).
 */
export function taskAssigneePeople(task: ProjectTask): AssigneeStackPerson[] {
  if (task.assignees && task.assignees.length > 0) {
    return task.assignees.map((a) => ({ userId: a.userId, name: a.name }));
  }
  if (task.assigneeId && task.assigneeName) {
    return [{ userId: task.assigneeId, name: task.assigneeName }];
  }
  return [];
}

export interface AssigneeStackProps {
  /** Assignees to render (in order). Empty/undefined → unassigned placeholder. */
  assignees?: AssigneeStackPerson[] | null;
  /** Avatar diameter (matches AssigneeAvatar). */
  size?: "sm" | "default" | "lg";
  /** Max avatars before collapsing into a "+N" counter. */
  max?: number;
  /** Render the lone name beside the avatar when there is exactly one. */
  showName?: boolean;
  /** Label (and SR text) shown when there are no assignees. */
  unassignedLabel?: string;
  className?: string;
}

/**
 * Overlapping avatar stack for a task's assignees (multi-assignee — spec §4.2).
 * Shows up to `max` initials/photo avatars; any overflow collapses into a muted
 * "+N" counter. A single assignee can optionally show its name inline (parity
 * with the old single `AssigneeAvatar`); an empty set renders the muted
 * unassigned person glyph so it's never a blank circle. The wrapping element
 * carries a `title` listing every assignee for a native tooltip, and an SR-only
 * summary keeps it accessible.
 */
export function AssigneeStack({
  assignees,
  size = "sm",
  max = 3,
  showName = false,
  unassignedLabel = "Unassigned",
  className,
}: AssigneeStackProps) {
  const people = (assignees ?? []).filter((a) => a.name?.trim().length > 0);
  const count = people.length;

  // Empty → reuse the unassigned placeholder look.
  if (count === 0) {
    return (
      <span
        data-slot="assignee-stack"
        className={cn("inline-flex items-center gap-2", className)}
        title={unassignedLabel}
      >
        <Avatar size={size} className="bg-muted">
          <AvatarFallback className="text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden />
          </AvatarFallback>
        </Avatar>
        {showName ? (
          <span className="truncate text-sm text-muted-foreground">
            {unassignedLabel}
          </span>
        ) : (
          <span className="sr-only">{unassignedLabel}</span>
        )}
      </span>
    );
  }

  const shown = people.slice(0, max);
  const overflow = count - shown.length;
  const allNames = people.map((p) => p.name.trim()).join(", ");

  return (
    <span
      data-slot="assignee-stack"
      className={cn("inline-flex items-center gap-2", className)}
      title={allNames}
    >
      <span
        data-slot="assignee-stack-avatars"
        className="flex -space-x-1.5 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background"
      >
        {shown.map((p) => (
          <Avatar key={p.userId} size={size}>
            {p.avatarUrl ? (
              <AvatarImage src={p.avatarUrl} alt={p.name} />
            ) : null}
            <AvatarFallback>{initials(p.name.trim())}</AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <Avatar size={size} aria-hidden>
            <AvatarFallback className="text-[0.65rem] font-medium tabular-nums">
              +{overflow}
            </AvatarFallback>
          </Avatar>
        )}
      </span>
      {showName && count === 1 ? (
        <span className="truncate text-sm">{shown[0].name.trim()}</span>
      ) : (
        <span className="sr-only">{allNames}</span>
      )}
    </span>
  );
}
