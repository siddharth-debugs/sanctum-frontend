"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowUpRight, Ban, OctagonAlert, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  StatusBadge,
  PriorityIcon,
  TaskPickerPopover,
} from "@/components/app/tasks";
import { LABEL_COLORS } from "@/lib/constants/project-options";
import {
  useAddTaskDependency,
  useRemoveTaskDependency,
} from "@/hooks/use-task-dependencies";
import { useProjectTasks } from "@/hooks/use-project-tasks";
import { ApiError } from "@/lib/api/client";
import type {
  ProjectTask,
  ProjectTaskDependencies,
} from "@/lib/api/types";

/**
 * Dependency tones map to the shared label palette (spec §6.3) so the rose
 * "blocked-by" / amber "blocks" accents stay a single source of truth instead
 * of duplicated hex values.
 */
const DEP_TONE_COLOR: Record<"rose" | "amber", string> = {
  rose: LABEL_COLORS.rose.color,
  amber: LABEL_COLORS.amber.color,
};

export interface TaskDependenciesProps {
  projectId: string;
  taskId: string;
  dependencies: ProjectTaskDependencies;
  onOpenTask: (taskId: string) => void;
}

/** One dependency edge row: jump-link to the task + a remove affordance. */
function DependencyRow({
  task,
  depId,
  tone,
  onOpenTask,
  onRemove,
  removing,
}: {
  task: ProjectTask;
  depId: string;
  tone: "rose" | "amber";
  onOpenTask: (taskId: string) => void;
  onRemove: (depId: string) => void;
  removing: boolean;
}) {
  return (
    <li className="group flex items-center gap-2 rounded-md border bg-card/40 px-2.5 py-1.5 transition-colors duration-150 hover:border-primary/40">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: DEP_TONE_COLOR[tone] }}
        aria-hidden
      />
      <StatusBadge status={task.status} dotOnly />
      <PriorityIcon priority={task.priority} hideLabel />
      <button
        type="button"
        onClick={() => onOpenTask(task.id)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1 truncate text-left text-sm transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          task.status === "done" && "text-muted-foreground line-through",
        )}
      >
        <span className="truncate">{task.title}</span>
        <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-60" />
      </button>
      <button
        type="button"
        onClick={() => onRemove(depId)}
        disabled={removing}
        aria-label={`Remove dependency on ${task.title}`}
        className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-50"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

/** A labelled dependency group ("Blocked by" / "Blocks") with its adder. */
function DependencyGroup({
  title,
  icon,
  tone,
  edges,
  candidates,
  candidatesLoading,
  linkedIds,
  emptyText,
  onOpenTask,
  onAdd,
  onRemove,
  removingId,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "rose" | "amber";
  edges: ProjectTaskDependencies["blockedBy"];
  candidates: ProjectTask[];
  candidatesLoading: boolean;
  linkedIds: string[];
  emptyText: string;
  onOpenTask: (taskId: string) => void;
  onAdd: (task: ProjectTask) => void;
  onRemove: (depId: string) => void;
  removingId: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      {edges.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground/70">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {edges.map((e) => (
            <DependencyRow
              key={e.depId}
              task={e.task}
              depId={e.depId}
              tone={tone}
              onOpenTask={onOpenTask}
              onRemove={onRemove}
              removing={removingId === e.depId}
            />
          ))}
        </ul>
      )}
      <TaskPickerPopover
        tasks={candidates}
        disabledIds={linkedIds}
        isLoading={candidatesLoading}
        emptyText="No other tasks to link."
        onSelect={onAdd}
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Add {title.toLowerCase()}
        </Button>
      </TaskPickerPopover>
    </div>
  );
}

/**
 * Dependency editor (spec §4.1) — "Blocked by" (rose) and "Blocks" (amber)
 * groups. Each edge jump-links to its task and can be removed; each group's
 * adder opens the shared searchable `TaskPickerPopover`, pre-filtered to exclude
 * self and already-linked tasks (the server still enforces cycle rejection and
 * surfaces violations as a toast). The colour tone is paired with a labelled
 * heading + icon, never colour alone.
 */
export function TaskDependencies({
  projectId,
  taskId,
  dependencies,
  onOpenTask,
}: TaskDependenciesProps) {
  const addDep = useAddTaskDependency(projectId, taskId);
  const removeDep = useRemoveTaskDependency(projectId, taskId);
  // Top-level tasks only as link candidates (no subtasks in dependency picker).
  const { data: allTasks = [], isLoading } = useProjectTasks(projectId, {
    includeSubtasks: false,
  });

  const blockedByIds = dependencies.blockedBy.map((e) => e.task.id);
  const blocksIds = dependencies.blocks.map((e) => e.task.id);

  // Candidates exclude this task itself and anything already linked either way.
  const candidates = React.useMemo(() => {
    const exclude = new Set([taskId, ...blockedByIds, ...blocksIds]);
    return allTasks.filter((t) => !exclude.has(t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, taskId, blockedByIds.join(","), blocksIds.join(",")]);

  function add(type: "blocked_by" | "blocks", task: ProjectTask) {
    addDep.mutate(
      { type, otherTaskId: task.id },
      {
        onError: (err) =>
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Couldn't add the dependency",
          ),
      },
    );
  }

  function remove(depId: string) {
    removeDep.mutate(depId, {
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't remove dependency",
        ),
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Dependencies</h3>
      <DependencyGroup
        title="Blocked by"
        icon={
          <Ban
            className="size-3.5"
            style={{ color: DEP_TONE_COLOR.rose }}
            aria-hidden
          />
        }
        tone="rose"
        edges={dependencies.blockedBy}
        candidates={candidates}
        candidatesLoading={isLoading}
        linkedIds={[...blockedByIds, ...blocksIds]}
        emptyText="Nothing is blocking this task."
        onOpenTask={onOpenTask}
        onAdd={(t) => add("blocked_by", t)}
        onRemove={remove}
        removingId={removeDep.isPending ? removeDep.variables ?? null : null}
      />
      <DependencyGroup
        title="Blocks"
        icon={
          <OctagonAlert
            className="size-3.5"
            style={{ color: DEP_TONE_COLOR.amber }}
            aria-hidden
          />
        }
        tone="amber"
        edges={dependencies.blocks}
        candidates={candidates}
        candidatesLoading={isLoading}
        linkedIds={[...blockedByIds, ...blocksIds]}
        emptyText="This task isn't blocking anything."
        onOpenTask={onOpenTask}
        onAdd={(t) => add("blocks", t)}
        onRemove={remove}
        removingId={removeDep.isPending ? removeDep.variables ?? null : null}
      />
    </div>
  );
}
