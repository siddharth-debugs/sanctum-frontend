"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Link2,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
  Unlink,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/app/(app)/session-context";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import {
  useThread,
  useThreadMessages,
  useSendMessage,
  useTypingIndicator,
  useUpdateThread,
  useDeleteThread,
} from "@/hooks/use-messages";
import type { Thread, ThreadStatus } from "@/lib/api/types";
import { ParticipantAvatars } from "./participant-avatars";
import { ManageParticipantsDialog } from "./manage-participants-dialog";
import { MessageList } from "./message-list";
import { Composer } from "./composer";

const STATUS_OPTIONS: { value: ThreadStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "awaiting", label: "Awaiting" },
  // 'closed' reads as "Resolved" in the UI.
  { value: "closed", label: "Resolved" },
];

const STATUS_STYLE: Record<ThreadStatus, string> = {
  open: "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary",
  awaiting:
    "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-accent-foreground",
  closed: "bg-muted text-muted-foreground",
};

function statusLabel(status: ThreadStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function StatusChanger({
  threadId,
  status,
}: {
  threadId: string;
  status: ThreadStatus;
}) {
  const update = useUpdateThread(threadId);

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
          {statusLabel(status)}
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

/** Rename dialog for the thread subject. */
function RenameDialog({
  open,
  onOpenChange,
  threadId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  initial: string;
}) {
  const update = useUpdateThread(threadId);
  const [subject, setSubject] = React.useState(initial);

  React.useEffect(() => {
    if (open) setSubject(initial);
  }, [open, initial]);

  const save = () => {
    const next = subject.trim();
    if (!next || next === initial) {
      onOpenChange(false);
      return;
    }
    update.mutate(
      { subject: next },
      {
        onSuccess: () => {
          toast.success("Thread renamed");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't rename thread",
          ),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename thread</DialogTitle>
          <DialogDescription>
            Give this conversation a clear subject.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={update.isPending || !subject.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The ⋯ menu in the thread header: rename / re-link / resolve / delete. */
function ThreadMenu({ thread }: { thread: Thread }) {
  const router = useRouter();
  const update = useUpdateThread(thread.id);
  const del = useDeleteThread();
  const { data: clients } = useClients();
  const { data: projects } = useProjects(
    thread.clientId ? { clientId: thread.clientId } : undefined,
  );
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [peopleOpen, setPeopleOpen] = React.useState(false);

  const isResolved = thread.status === "closed";

  const relink = (input: { clientId?: string | null; projectId?: string | null }) =>
    update.mutate(input, {
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't update the link",
        ),
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Thread options"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="size-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPeopleOpen(true)}>
            <Users className="size-3.5" /> Manage people
          </DropdownMenuItem>

          {/* Re-link client */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Link2 className="size-3.5" /> Client
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-64 w-52 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => relink({ clientId: null })}
                disabled={!thread.clientId}
              >
                <Unlink className="size-3.5" /> No client
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(clients ?? []).map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => relink({ clientId: c.id })}
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === thread.clientId && (
                    <CheckCircle2 className="ml-auto size-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Re-link project (only meaningful with a client) */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!thread.clientId}>
              <Briefcase className="size-3.5" /> Project
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-64 w-52 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => relink({ projectId: null })}
                disabled={!thread.projectId}
              >
                <Unlink className="size-3.5" /> No project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(projects ?? []).length === 0 ? (
                <DropdownMenuItem disabled>No projects</DropdownMenuItem>
              ) : (
                (projects ?? []).map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => relink({ projectId: p.id })}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.id === thread.projectId && (
                      <CheckCircle2 className="ml-auto size-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {isResolved ? (
            <DropdownMenuItem onClick={() => update.mutate({ status: "open" })}>
              <RotateCcw className="size-3.5" /> Reopen
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => update.mutate({ status: "closed" })}>
              <CheckCircle2 className="size-3.5" /> Mark resolved
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" /> Delete thread
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        threadId={thread.id}
        initial={thread.subject}
      />

      <ManageParticipantsDialog
        open={peopleOpen}
        onOpenChange={setPeopleOpen}
        thread={thread}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this thread?</DialogTitle>
            <DialogDescription>
              This permanently removes the conversation and all its messages for
              everyone. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={del.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() =>
                del.mutate(thread.id, {
                  onSuccess: () => {
                    toast.success("Thread deleted");
                    setDeleteOpen(false);
                    router.replace("/messages");
                  },
                  onError: (err) =>
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Couldn't delete the thread",
                    ),
                })
              }
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConversationPane({ threadId }: { threadId: string }) {
  const session = useSession();
  const { data: thread, isLoading: threadLoading } = useThread(threadId);
  const {
    data: messages,
    isLoading: messagesLoading,
  } = useThreadMessages(threadId);
  const { send, sendWithAttachments, emitTyping } = useSendMessage(threadId);
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
            <ThreadMenu thread={thread} />
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
          threadId={threadId}
        />
      )}

      {/* Composer */}
      <Composer
        onSend={send}
        onSendWithAttachments={sendWithAttachments}
        onType={emitTyping}
      />
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
