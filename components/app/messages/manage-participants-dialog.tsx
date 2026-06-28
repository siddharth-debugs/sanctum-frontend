"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserPlus, X, Loader2, Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeam } from "@/hooks/use-team";
import { useUpdateThread } from "@/hooks/use-messages";
import { useSession } from "@/app/(app)/session-context";
import { ApiError } from "@/lib/api/client";
import { initials } from "@/lib/utils";
import type { Thread } from "@/lib/api/types";

/**
 * Add or remove people in a message thread. The backend's PATCH
 * /messages/threads/:id accepts add/removeParticipantIds; this is the UI for it.
 */
export function ManageParticipantsDialog({
  open,
  onOpenChange,
  thread,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thread: Thread;
}) {
  const update = useUpdateThread(thread.id);
  const { data: team } = useTeam();
  const session = useSession();
  const [search, setSearch] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const participantIds = React.useMemo(
    () => new Set(thread.participants.map((p) => p.userId)),
    [thread.participants],
  );

  const candidates = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (team ?? [])
      .filter((m) => m.status === "active" && !participantIds.has(m.id))
      .filter(
        (m) =>
          !q ||
          (m.fullName ?? m.email).toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      );
  }, [team, participantIds, search]);

  const add = (userId: string) => {
    setBusyId(userId);
    update.mutate(
      { addParticipantIds: [userId] },
      {
        onSuccess: () => toast.success("Added to the conversation"),
        onError: (e) =>
          toast.error(
            e instanceof ApiError ? e.message : "Couldn't add them",
          ),
        onSettled: () => setBusyId(null),
      },
    );
  };

  const remove = (userId: string) => {
    setBusyId(userId);
    update.mutate(
      { removeParticipantIds: [userId] },
      {
        onSuccess: () => toast.success("Removed from the conversation"),
        onError: (e) =>
          toast.error(
            e instanceof ApiError ? e.message : "Couldn't remove them",
          ),
        onSettled: () => setBusyId(null),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4 text-primary" /> People in this conversation
          </DialogTitle>
          <DialogDescription>
            Anyone added here can see and reply to this thread.
          </DialogDescription>
        </DialogHeader>

        {/* Current participants */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            In this thread · {thread.participants.length}
          </p>
          <ul className="max-h-44 space-y-0.5 overflow-y-auto">
            {thread.participants.map((p) => {
              const isMe = p.userId === session.user.id;
              return (
                <li
                  key={p.userId}
                  className="flex items-center gap-2.5 rounded-md px-1 py-1"
                >
                  <Avatar size="sm">
                    {p.avatarUrl ? (
                      <AvatarImage src={p.avatarUrl} alt={p.name} />
                    ) : null}
                    <AvatarFallback className="text-[10px] font-semibold">
                      {initials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {p.name}
                    {isMe && (
                      <span className="text-muted-foreground"> (You)</span>
                    )}
                  </span>
                  {!isMe && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      disabled={busyId === p.userId}
                      onClick={() => remove(p.userId)}
                      aria-label={`Remove ${p.name}`}
                    >
                      {busyId === p.userId ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Add people */}
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add people
          </p>
          <Input
            placeholder="Search teammates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search teammates to add"
          />
          <ul className="max-h-44 space-y-0.5 overflow-y-auto">
            {candidates.length === 0 ? (
              <li className="px-1 py-3 text-center text-sm text-muted-foreground">
                {(team ?? []).filter((m) => m.status === "active").length <= 1
                  ? "No other teammates yet."
                  : search.trim()
                    ? "No matches."
                    : "Everyone's already in this thread."}
              </li>
            ) : (
              candidates.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2.5 rounded-md px-1 py-1"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="text-[10px] font-semibold">
                      {initials(m.fullName ?? m.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {m.fullName ?? m.email}
                    <span className="block truncate text-xs text-muted-foreground">
                      {m.roleName}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9"
                    disabled={busyId === m.id}
                    onClick={() => add(m.id)}
                  >
                    {busyId === m.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="size-3.5" />
                    )}
                    Add
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
