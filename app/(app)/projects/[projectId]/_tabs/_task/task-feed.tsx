"use client";

import * as React from "react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { Check, MessageSquare, Pencil, Trash2, X } from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  describeActivity,
  ACTIVITY_TONE_CLASS,
} from "@/lib/constants/activity-options";
import {
  useUpdateTaskComment,
  useDeleteTaskComment,
} from "@/hooks/use-task-comments";
import { ApiError } from "@/lib/api/client";
import type {
  ProjectTaskComment,
  ProjectTaskFeedEntry,
} from "@/lib/api/types";

export interface TaskFeedProps {
  projectId: string;
  taskId: string;
  feed: ProjectTaskFeedEntry[];
  /** Current user id — gates author-only comment edit/delete. */
  currentUserId: string | null;
}

/** A best-effort timestamp for an entry; safe against missing values. */
function entryTime(at: string | null): React.ReactNode {
  if (!at) return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <time
      dateTime={at}
      title={format(d, "PPpp")}
      className="shrink-0 text-xs tabular-nums text-muted-foreground"
    >
      {formatDistanceToNow(d, { addSuffix: true })}
    </time>
  );
}

/** An audit-activity row, rendered with the shared `describeActivity` mapper. */
function ActivityEntry({
  entry,
}: {
  entry: Extract<ProjectTaskFeedEntry, { kind: "activity" }>;
}) {
  const a = entry.activity;
  const view = describeActivity(a);
  return (
    <li className="flex items-start gap-3 px-1 py-1.5">
      <span
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
          ACTIVITY_TONE_CLASS[view.tone],
        )}
      >
        {view.icon}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-snug">
        <span className="font-medium">{a.actorName ?? "Someone"}</span>{" "}
        <span className="text-muted-foreground">{view.summary}</span>
      </div>
      {entryTime(entry.at)}
    </li>
  );
}

/** A comment card with author-only inline edit + delete. */
function CommentEntry({
  projectId,
  taskId,
  comment,
  canManage,
}: {
  projectId: string;
  taskId: string;
  comment: ProjectTaskComment;
  canManage: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(comment.body);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const update = useUpdateTaskComment(projectId, taskId);
  const remove = useDeleteTaskComment(projectId, taskId);

  const pending = comment.id.startsWith("tmp_");
  const edited = comment.updatedAt !== comment.createdAt;

  function saveEdit() {
    const next = draft.trim();
    if (!next) return;
    if (next === comment.body.trim()) {
      setEditing(false);
      return;
    }
    update.mutate(
      { commentId: comment.id, input: { body: next } },
      {
        onSuccess: () => setEditing(false),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't save the edit",
          ),
      },
    );
  }

  function doDelete() {
    remove.mutate(comment.id, {
      onSuccess: () => toast.success("Comment deleted"),
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't delete comment",
        ),
    });
  }

  return (
    <li
      className={cn(
        "group flex items-start gap-3 px-1 py-1.5",
        pending && "opacity-60",
      )}
    >
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback className="text-[10px]">
          {initials(comment.authorName ?? "?")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {comment.authorName ?? "You"}
          </span>
          {entryTime(comment.createdAt)}
          {edited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {canManage && !editing && !pending && (
            <span className="ml-auto flex items-center opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Edit comment"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(true);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Delete comment"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5 space-y-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
              className="min-h-16 text-sm"
              aria-label="Edit comment"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={saveEdit}
                disabled={!draft.trim() || update.isPending}
              >
                <Check className="size-3.5" />
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={update.isPending}
              >
                <X className="size-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {comment.body}
          </p>
        )}

        {confirmDelete && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs">
            <span className="flex-1">Delete this comment?</span>
            <Button
              type="button"
              size="xs"
              variant="destructive"
              onClick={doDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Merged comments + activity feed (spec §4.1). Renders one chronological list
 * where audit entries reuse `describeActivity` and comment entries render as
 * cards with author-only edit/delete. The composer lives in the sheet above
 * this; here we only render history with an explicit empty state.
 */
export function TaskFeed({
  projectId,
  taskId,
  feed,
  currentUserId,
}: TaskFeedProps) {
  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
        <MessageSquare className="size-5 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No comments or activity yet.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Start the conversation below.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {feed.map((entry, i) => {
        if (entry.kind === "comment") {
          return (
            <CommentEntry
              key={`c-${entry.comment.id}`}
              projectId={projectId}
              taskId={taskId}
              comment={entry.comment}
              canManage={
                !!currentUserId && entry.comment.authorId === currentUserId
              }
            />
          );
        }
        return (
          <ActivityEntry
            key={`a-${entry.activity.id}-${i}`}
            entry={entry}
          />
        );
      })}
    </ul>
  );
}
