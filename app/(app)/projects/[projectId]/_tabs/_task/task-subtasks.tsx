"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AssigneeStack, taskAssigneePeople } from "@/components/app/tasks";
import { useCreateSubtask } from "@/hooks/use-task-subtasks";
import { useUpdateProjectTask } from "@/hooks/use-project-tasks";
import { ApiError } from "@/lib/api/client";
import type { ProjectTask, ProjectTaskStatus } from "@/lib/api/types";

export interface TaskSubtasksProps {
  projectId: string;
  parentTaskId: string;
  subtasks: ProjectTask[];
  /** Re-open the sheet on a clicked subtask (spec §4.1 — each re-opens here). */
  onOpenTask: (taskId: string) => void;
}

/** A subtask counts as complete when its status is `done`. */
function isDone(t: ProjectTask): boolean {
  return t.status === "done";
}

/**
 * One-level subtask checklist (spec §4.1). Shows a "(done/total)" progress bar,
 * a quick-add row, and each subtask as a checkbox + title that toggles
 * done/todo and re-opens the sheet on click. All mutations are optimistic via
 * the shared task hooks.
 */
export function TaskSubtasks({
  projectId,
  parentTaskId,
  subtasks,
  onOpenTask,
}: TaskSubtasksProps) {
  const [title, setTitle] = React.useState("");
  const createSubtask = useCreateSubtask(projectId, parentTaskId);
  const updateTask = useUpdateProjectTask(projectId);

  const total = subtasks.length;
  const done = subtasks.filter(isDone).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function add() {
    const t = title.trim();
    if (!t || createSubtask.isPending) return;
    createSubtask.mutate(
      { title: t, status: "todo" },
      {
        onSuccess: () => setTitle(""),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add subtask",
          ),
      },
    );
  }

  function toggle(sub: ProjectTask) {
    const next: ProjectTaskStatus = isDone(sub) ? "todo" : "done";
    updateTask.mutate(
      { taskId: sub.id, input: { status: next } },
      {
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't update subtask",
          ),
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Subtasks</h3>
        {total > 0 && (
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {done}/{total}
          </span>
        )}
      </div>

      {total > 0 && (
        <Progress
          value={pct}
          className="h-1.5"
          aria-label={`${done} of ${total} subtasks complete`}
        />
      )}

      {total > 0 && (
        <ul className="space-y-0.5">
          {subtasks.map((sub) => {
            const complete = isDone(sub);
            return (
              <li
                key={sub.id}
                className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors duration-150 hover:bg-muted/60"
              >
                <Checkbox
                  checked={complete}
                  onCheckedChange={() => toggle(sub)}
                  aria-label={
                    complete ? "Mark subtask incomplete" : "Mark subtask done"
                  }
                />
                <button
                  type="button"
                  onClick={() => onOpenTask(sub.id)}
                  className={cn(
                    "min-w-0 flex-1 truncate text-left text-sm transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    complete && "text-muted-foreground line-through",
                  )}
                >
                  {sub.title}
                </button>
                {(() => {
                  const people = taskAssigneePeople(sub);
                  return people.length > 0 ? (
                    <AssigneeStack assignees={people} max={3} />
                  ) : null;
                })()}
              </li>
            );
          })}
        </ul>
      )}

      {/* Quick-add */}
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a subtask…"
          aria-label="New subtask title"
          className="h-8"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={add}
          disabled={!title.trim() || createSubtask.isPending}
          aria-label="Add subtask"
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </div>
  );
}
