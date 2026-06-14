"use client";

import * as React from "react";
import { toast } from "sonner";
import { ListChecks, Plus, Play, Square, Trash2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerStandalone } from "@/components/app/date-picker-standalone";
import { ComboboxStandalone } from "@/components/app/combobox-standalone";
import {
  useProjectTasks,
  useCreateProjectTask,
  useUpdateProjectTask,
  useDeleteProjectTask,
} from "@/hooks/use-project-tasks";
import { useProjectMembers } from "@/hooks/use-project-members";
import { useTeam } from "@/hooks/use-team";
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useElapsed,
  fmtClock,
} from "@/hooks/use-timers";
import { useMe } from "@/hooks/use-me";
import {
  TASK_STATUSES,
  TASK_STATUS_DOT,
} from "@/lib/constants/project-options";
import { ApiError } from "@/lib/api/client";
import { initials, formatDate, cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ProjectTask, ProjectTaskStatus } from "@/lib/api/types";
import { EmptyState, ListSkeleton } from "./shared";

/* ------------------------------------------------------------------ */
/* Timer control — Start, or a live Stop button when THIS task is the   */
/* current user's running timer.                                        */
/* ------------------------------------------------------------------ */

function TaskTimerControl({
  projectId,
  task,
  isActive,
}: {
  projectId: string;
  task: ProjectTask;
  isActive: boolean;
}) {
  const start = useStartTimer();
  const stop = useStopTimer();
  const { data: timer } = useActiveTimer();
  const elapsed = useElapsed(isActive ? timer?.startedAt : undefined);

  if (isActive) {
    return (
      <Button
        size="sm"
        variant="destructive"
        className="h-8 gap-1.5 rounded-full px-2.5"
        disabled={stop.isPending}
        onClick={() =>
          stop.mutate(undefined, {
            onError: (err) =>
              toast.error(
                err instanceof ApiError ? err.message : "Couldn't stop timer",
              ),
          })
        }
        aria-label="Stop timer"
      >
        <Square className="size-3 fill-current" />
        <span className="font-mono tabular-nums">{fmtClock(elapsed)}</span>
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 rounded-full px-2.5"
      disabled={start.isPending}
      onClick={() =>
        start.mutate(
          { projectId, taskId: task.id },
          {
            onSuccess: () => toast.success(`Timer started · ${task.title}`),
            onError: (err) =>
              toast.error(
                err instanceof ApiError ? err.message : "Couldn't start timer",
              ),
          },
        )
      }
      aria-label={`Start timer on ${task.title}`}
    >
      <Play className="size-3.5" />
      Start
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Task card                                                           */
/* ------------------------------------------------------------------ */

function TaskCard({
  projectId,
  task,
  isActiveTimer,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  projectId: string;
  task: ProjectTask;
  isActiveTimer: boolean;
  onEdit: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
  onStatusChange: (taskId: string, status: ProjectTaskStatus) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]",
        isActiveTimer &&
          "border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--card))]",
      )}
    >
      {/* Status dot + inline changer */}
      <Select
        value={task.status}
        onValueChange={(v) => onStatusChange(task.id, v as ProjectTaskStatus)}
      >
        <SelectTrigger
          size="sm"
          aria-label="Change status"
          className="size-8 shrink-0 justify-center gap-0 rounded-full border-none bg-transparent p-0 shadow-none hover:bg-muted [&>svg:last-child]:hidden"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: TASK_STATUS_DOT[task.status] }}
          />
        </SelectTrigger>
        <SelectContent align="start">
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              <span
                className="mr-1.5 inline-block size-2 rounded-full align-middle"
                style={{ backgroundColor: s.dot }}
              />
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium leading-tight",
            task.status === "done" && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        {task.dueDate && (
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            Due {formatDate(task.dueDate)}
          </p>
        )}
      </div>

      {/* Assignee */}
      {task.assigneeName ? (
        <Avatar size="sm" title={task.assigneeName}>
          <AvatarFallback className="text-[10px]">
            {initials(task.assigneeName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span className="hidden text-xs text-muted-foreground/60 sm:inline">
          Unassigned
        </span>
      )}

      {/* Timer control */}
      <TaskTimerControl
        projectId={projectId}
        task={task}
        isActive={isActiveTimer}
      />

      {/* Edit + delete */}
      <div className="flex shrink-0 items-center opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(task)}
          aria-label="Edit task"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(task)}
          aria-label="Delete task"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Edit dialog                                                         */
/* ------------------------------------------------------------------ */

function EditTaskDialog({
  task,
  assigneeOptions,
  onClose,
  onSave,
  saving,
}: {
  task: ProjectTask;
  assigneeOptions: { value: string; label: string }[];
  onClose: () => void;
  onSave: (input: {
    title: string;
    status: ProjectTaskStatus;
    assigneeId: string | null;
    dueDate: string | null;
  }) => void;
  saving: boolean;
}) {
  const [title, setTitle] = React.useState(task.title);
  const [status, setStatus] = React.useState<ProjectTaskStatus>(task.status);
  const [assigneeId, setAssigneeId] = React.useState(task.assigneeId ?? "");
  const [due, setDue] = React.useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined,
  );

  const valid = title.trim().length > 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update the title, status, assignee, or due date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="edit-task-title">
              Title
            </label>
            <Input
              id="edit-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!valid}
            />
            {!valid && (
              <p className="text-xs text-destructive">A title is required.</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectTaskStatus)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due date</label>
              <DatePickerStandalone
                value={due}
                onChange={setDue}
                placeholder="No due date"
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Assignee</label>
            <ComboboxStandalone
              value={assigneeId}
              onChange={setAssigneeId}
              options={assigneeOptions}
              placeholder="Unassigned"
              searchPlaceholder="Search people…"
              emptyText="No matching people."
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={!valid || saving}
            onClick={() =>
              onSave({
                title: title.trim(),
                status,
                assigneeId: assigneeId || null,
                dueDate: due ? format(due, "yyyy-MM-dd") : null,
              })
            }
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Tasks tab                                                           */
/* ------------------------------------------------------------------ */

export function TasksTab({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: team } = useTeam();
  const { data: timer } = useActiveTimer();
  const me = useMe();

  const createTask = useCreateProjectTask(projectId);
  const updateTask = useUpdateProjectTask(projectId);
  const deleteTask = useDeleteProjectTask(projectId);

  const [title, setTitle] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [status, setStatus] = React.useState<ProjectTaskStatus>("todo");
  const [due, setDue] = React.useState<Date | undefined>(undefined);

  const [editing, setEditing] = React.useState<ProjectTask | null>(null);
  const [deleting, setDeleting] = React.useState<ProjectTask | null>(null);

  // Assignee picker = project members first; fall back to the whole team.
  const assigneeOptions = React.useMemo(() => {
    const fromMembers = (members ?? []).map((m) => ({
      value: m.userId,
      label: m.userName,
    }));
    if (fromMembers.length > 0) return fromMembers;
    return (team ?? []).map((t) => ({
      value: t.id,
      label: t.fullName ?? t.email,
    }));
  }, [members, team]);

  // The current user's running timer, only if it belongs to THIS project.
  const myUserId = me.data?.user.id;
  const activeTaskId =
    timer && timer.userId === myUserId && timer.projectId === projectId
      ? timer.taskId
      : null;

  const onAdd = () => {
    const t = title.trim();
    if (!t || createTask.isPending) return;
    createTask.mutate(
      {
        title: t,
        status,
        assigneeId: assigneeId || null,
        dueDate: due ? format(due, "yyyy-MM-dd") : null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setAssigneeId("");
          setDue(undefined);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add task",
          ),
      },
    );
  };

  const onStatusChange = (taskId: string, next: ProjectTaskStatus) => {
    updateTask.mutate(
      { taskId, input: { status: next } },
      {
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't update status",
          ),
      },
    );
  };

  const onConfirmDelete = () => {
    if (!deleting) return;
    deleteTask.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Task deleted");
        setDeleting(null);
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't delete task",
        ),
    });
  };

  const byStatus = React.useMemo(() => {
    const map: Record<ProjectTaskStatus, ProjectTask[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const t of tasks ?? []) map[t.status].push(t);
    return map;
  }, [tasks]);

  return (
    <div className="space-y-5">
      {/* Add task row */}
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd();
            }}
            placeholder="Add a task…"
            aria-label="New task title"
            className="h-11 flex-1"
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:flex lg:items-center">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ProjectTaskStatus)}
            >
              <SelectTrigger className="h-11 lg:w-36" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ComboboxStandalone
              value={assigneeId}
              onChange={setAssigneeId}
              options={assigneeOptions}
              placeholder="Assignee"
              searchPlaceholder="Search people…"
              emptyText="No people."
              className="h-11 w-full lg:w-40"
            />
            <DatePickerStandalone
              value={due}
              onChange={setDue}
              placeholder="Due date"
              className="h-11 w-full lg:w-36"
            />
          </div>
          <Button
            onClick={onAdd}
            disabled={createTask.isPending || !title.trim()}
            className="h-11 lg:w-auto"
          >
            <Plus className="size-4" />
            Add task
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-5" />}
          title="No tasks yet"
          description="Break the project into tasks, assign them, and track time as you work."
        />
      ) : (
        <div className="space-y-5">
          {TASK_STATUSES.map((col) => {
            const colTasks = byStatus[col.value as ProjectTaskStatus];
            if (colTasks.length === 0) return null;
            return (
              <section key={col.value} className="space-y-2">
                <div className="flex items-center gap-2 px-0.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: col.dot }}
                  />
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      projectId={projectId}
                      task={task}
                      isActiveTimer={activeTaskId === task.id}
                      onEdit={setEditing}
                      onDelete={setDeleting}
                      onStatusChange={onStatusChange}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <EditTaskDialog
          task={editing}
          assigneeOptions={assigneeOptions}
          saving={updateTask.isPending}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            updateTask.mutate(
              { taskId: editing.id, input },
              {
                onSuccess: () => {
                  toast.success("Task updated");
                  setEditing(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof ApiError ? err.message : "Couldn't save task",
                  ),
              },
            )
          }
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>
              {deleting ? (
                <>
                  This permanently removes <strong>{deleting.title}</strong> and
                  any logged time references. This can&apos;t be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleting(null)}
              disabled={deleteTask.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? "Deleting…" : "Delete task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
