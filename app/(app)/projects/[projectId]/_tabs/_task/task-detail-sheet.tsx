"use client";

import * as React from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusSelect } from "@/components/app/tasks";
import {
  useUpdateProjectTask,
  useDeleteProjectTask,
} from "@/hooks/use-project-tasks";
import { useTaskDetail } from "@/hooks/use-task-detail";
import { useSetTaskLabels } from "@/hooks/use-task-labels";
import { useCreateTaskComment } from "@/hooks/use-task-comments";
import { useProjectMilestones } from "@/hooks/use-project-milestones";
import { useProjectMembers } from "@/hooks/use-project-members";
import { useTeam } from "@/hooks/use-team";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api/client";
import type {
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@/lib/api/types";

import { TaskTitleInline } from "./task-title-inline";
import { TaskDescriptionInline } from "./task-description-inline";
import { TaskProperties, type AssigneeOption } from "./task-properties";
import { TaskSubtasks } from "./task-subtasks";
import { TaskDependencies } from "./task-dependencies";
import { TaskFeed } from "./task-feed";
import { CommentComposer, type MentionMember } from "./comment-composer";

export interface TaskDetailSheetProps {
  projectId: string;
  /** The task to show; null/undefined keeps the sheet closed (mounts ahead). */
  taskId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Navigate the sheet to another task (subtasks, dependency jump-links). */
  onOpenTask: (taskId: string) => void;
}

/** Short mono reference derived from the task id (e.g. "#A1B2C3"). */
function shortRef(taskId: string): string {
  const tail = taskId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `#${tail || taskId.slice(0, 6).toUpperCase()}`;
}

/* ------------------------------------------------------------------ */
/* Skeleton shown while the detail bundle loads.                        */
/* ------------------------------------------------------------------ */

function SheetSkeleton() {
  return (
    <div className="space-y-6 px-5 py-4">
      <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted/70" />
        ))}
      </div>
    </div>
  );
}

/**
 * Task detail slide-over (spec §4.1) — the single editing surface for a task.
 * A right-side `Sheet` (`w-full sm:max-w-[560px]`) with a sticky header
 * (short-ref · inline-edit title · status quick-switch · close), a scrolling
 * body (description, the inline-editable properties block, subtasks checklist,
 * dependencies, and the merged comments+activity feed with an @mention
 * composer), and a sticky footer (destructive-ghost Delete + created/updated
 * meta). Every edit is an optimistic mutation through the shared task hooks.
 * The shell controls visibility via `?task=` → `open`/`onOpenChange`; `Esc`
 * closes (Radix default) and `onOpenTask` re-targets the sheet in place.
 *
 * Signature: TaskDetailSheet({ projectId, taskId, open, onOpenChange, onOpenTask }).
 */
export function TaskDetailSheet({
  projectId,
  taskId,
  open,
  onOpenChange,
  onOpenTask,
}: TaskDetailSheetProps) {
  const { data: detail, isLoading, isError } = useTaskDetail(projectId, taskId);
  const { data: milestones = [] } = useProjectMilestones(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: team } = useTeam();
  const me = useMe();

  const updateTask = useUpdateProjectTask(projectId);
  const deleteTask = useDeleteProjectTask(projectId);
  const setLabels = useSetTaskLabels(projectId);
  const createComment = useCreateTaskComment(projectId, taskId ?? "");

  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Reset the delete confirmation whenever we switch tasks or close.
  React.useEffect(() => {
    setConfirmDelete(false);
  }, [taskId, open]);

  // Assignee + @mention candidates: project members first, else whole team.
  const assigneeOptions: AssigneeOption[] = React.useMemo(() => {
    const fromMembers = (members ?? []).map((m) => ({
      id: m.userId,
      name: m.userName,
    }));
    if (fromMembers.length > 0) return fromMembers;
    return (team ?? []).map((t) => ({
      id: t.id,
      name: t.fullName ?? t.email,
    }));
  }, [members, team]);

  const mentionMembers: MentionMember[] = assigneeOptions;

  const task = detail?.task;
  const labelIds = React.useMemo(
    () => (detail?.labels ?? []).map((l) => l.id),
    [detail?.labels],
  );

  function patch(
    input: Parameters<typeof updateTask.mutate>[0]["input"],
    errorMsg: string,
  ) {
    if (!task) return;
    updateTask.mutate(
      { taskId: task.id, input },
      {
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : errorMsg),
      },
    );
  }

  function onDelete() {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success("Task deleted");
        onOpenChange(false);
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't delete task",
        ),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 p-0 sm:max-w-[560px]"
      >
        {/* Accessible title (visually replaced by the inline editor below). */}
        <SheetTitle className="sr-only">
          {task ? task.title : "Task details"}
        </SheetTitle>

        {isLoading && !detail ? (
          <SheetSkeleton />
        ) : isError || !task || !detail ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium">Couldn&apos;t load this task</p>
            <p className="text-xs text-muted-foreground">
              It may have been deleted, or the connection dropped.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Sticky header */}
            <header className="sticky top-0 z-10 flex shrink-0 items-start gap-2 border-b bg-background px-5 py-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {shortRef(task.id)}
                  </span>
                  {task.parentTaskId && (
                    <button
                      type="button"
                      onClick={() => onOpenTask(task.parentTaskId!)}
                      className="truncate text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                    >
                      ↳ subtask
                    </button>
                  )}
                </div>
                <TaskTitleInline
                  value={task.title}
                  onSave={(next) => patch({ title: next }, "Couldn't rename task")}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusSelect
                  value={task.status}
                  onChange={(status: ProjectTaskStatus) =>
                    patch({ status }, "Couldn't update status")
                  }
                  aria-label="Task status"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close"
                  onClick={() => onOpenChange(false)}
                  className="text-muted-foreground"
                >
                  <span aria-hidden className="text-lg leading-none">
                    ×
                  </span>
                </Button>
              </div>
            </header>

            {/* Scroll body */}
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              {/* Description */}
              <TaskDescriptionInline
                value={task.description}
                onSave={(next) =>
                  patch({ description: next }, "Couldn't save description")
                }
              />

              <Separator />

              {/* Properties */}
              <TaskProperties
                projectId={projectId}
                status={task.status}
                priority={task.priority}
                assigneeId={task.assigneeId ?? null}
                assigneeOptions={assigneeOptions}
                startDate={task.startDate}
                dueDate={task.dueDate}
                estimateMinutes={task.estimateMinutes}
                milestoneId={task.milestoneId}
                milestones={milestones}
                labelIds={labelIds}
                onStatusChange={(status) =>
                  patch({ status }, "Couldn't update status")
                }
                onPriorityChange={(priority: ProjectTaskPriority) =>
                  patch({ priority }, "Couldn't update priority")
                }
                onAssigneeChange={(assigneeId) =>
                  patch({ assigneeId }, "Couldn't update assignee")
                }
                onStartDateChange={(startDate) =>
                  patch({ startDate }, "Couldn't update start date")
                }
                onDueDateChange={(dueDate) =>
                  patch({ dueDate }, "Couldn't update due date")
                }
                onEstimateChange={(estimateMinutes) =>
                  patch({ estimateMinutes }, "Couldn't update estimate")
                }
                onMilestoneChange={(milestoneId) =>
                  patch({ milestoneId }, "Couldn't move task")
                }
                onLabelsChange={(ids) =>
                  setLabels.mutate(
                    { taskId: task.id, labelIds: ids },
                    {
                      onError: (err) =>
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Couldn't update labels",
                        ),
                    },
                  )
                }
              />

              {/* Subtasks — only for top-level tasks (one level, no grandchildren). */}
              {!task.parentTaskId && (
                <>
                  <Separator />
                  <TaskSubtasks
                    projectId={projectId}
                    parentTaskId={task.id}
                    subtasks={detail.subtasks}
                    onOpenTask={onOpenTask}
                  />
                </>
              )}

              <Separator />

              {/* Dependencies */}
              <TaskDependencies
                projectId={projectId}
                taskId={task.id}
                dependencies={detail.dependencies}
                onOpenTask={onOpenTask}
              />

              <Separator />

              {/* Comments + activity */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Comments &amp; activity</h3>
                <CommentComposer
                  members={mentionMembers}
                  pending={createComment.isPending}
                  onSubmit={(body, mentions) =>
                    createComment.mutate(
                      { body, mentions },
                      {
                        onError: (err) =>
                          toast.error(
                            err instanceof ApiError
                              ? err.message
                              : "Couldn't post comment",
                          ),
                      },
                    )
                  }
                />
                <TaskFeed
                  projectId={projectId}
                  taskId={task.id}
                  feed={detail.feed}
                  currentUserId={me.data?.user.id ?? null}
                />
              </section>
            </div>

            {/* Sticky footer */}
            <footer className="sticky bottom-0 z-10 flex shrink-0 items-center gap-3 border-t bg-background px-5 py-3">
              {confirmDelete ? (
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Delete this task{!task.parentTaskId ? " and its subtasks" : ""}?
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                    disabled={deleteTask.isPending}
                    className="ml-auto"
                  >
                    {deleteTask.isPending ? "Deleting…" : "Delete"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleteTask.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                  <span className="ml-auto truncate text-right text-xs text-muted-foreground">
                    Updated{" "}
                    {formatDistanceToNow(new Date(task.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </>
              )}
            </footer>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
