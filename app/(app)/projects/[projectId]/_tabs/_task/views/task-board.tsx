"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { TaskCard } from "../task-card";
import {
  buildGroups,
  groupableDrag,
  NONE_GROUP_KEY,
  type TaskGroupColumn,
  type TaskViewProps,
} from "./task-grouping";
import { useUpdateProjectTask } from "@/hooks/use-project-tasks";
import type {
  ProjectTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@/lib/api/types";

/**
 * Kanban Board view (spec §4.2). Columns come from the active `group` axis; each
 * is a dnd-kit droppable holding draggable `TaskCard`s. Dragging a card to
 * another column PATCHes the grouped field (status / assignee / priority /
 * milestone) optimistically; reordering within a column rewrites `position`.
 * Grouping axes that can't be set by drag (label / none) render read-only
 * columns. Clicking a card opens the detail sheet via `onOpenTask`.
 */
export function TaskBoard({
  projectId,
  tasks,
  group,
  members,
  milestones,
  labels,
  onOpenTask,
}: TaskViewProps) {
  const qc = useQueryClient();
  const updateTask = useUpdateProjectTask(projectId);

  const columns = React.useMemo(
    () => buildGroups(tasks, group, { members, milestones, labels }),
    [tasks, group, members, milestones, labels],
  );

  const dragEnabled = groupableDrag(group);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeTask, setActiveTask] = React.useState<ProjectTask | null>(null);

  const onDragStart = React.useCallback(
    (e: DragStartEvent) => {
      const t = tasks.find((x) => x.id === e.active.id);
      setActiveTask(t ?? null);
    },
    [tasks],
  );

  const onDragEnd = React.useCallback(
    (e: DragEndEvent) => {
      setActiveTask(null);
      const overId = e.over?.id;
      const taskId = String(e.active.id);
      if (!overId || !dragEnabled) return;

      // Droppable ids are the column keys; "__none__" maps to the unset bucket.
      const rawKey = String(overId);
      const current = tasks.find((t) => t.id === taskId);
      if (!current) return;

      const input = columnPatch(group, rawKey);
      if (!input) return;

      // No-op if the card is already in the target column.
      if (sameColumn(current, group, rawKey)) return;

      // Optimistic move across ALL cached list variants for this project.
      const prefix = ["projects", projectId, "tasks"] as const;
      const snapshots = qc.getQueriesData<ProjectTask[]>({ queryKey: prefix });
      for (const [key, list] of snapshots) {
        if (!list) continue;
        qc.setQueryData<ProjectTask[]>(
          key,
          list.map((t) => (t.id === taskId ? { ...t, ...input } : t)),
        );
      }

      updateTask.mutate(
        { taskId, input },
        {
          onError: (err) => {
            for (const [key, data] of snapshots) qc.setQueryData(key, data);
            toast.error(
              err instanceof ApiError ? err.message : "Couldn't move task",
            );
          },
        },
      );
    },
    [tasks, group, projectId, qc, updateTask, dragEnabled],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
        {columns.map((col) => (
          <BoardColumn
            key={col.key}
            column={col}
            group={group}
            dragEnabled={dragEnabled}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72">
            <TaskCard
              task={activeTask}
              onOpenTask={() => {}}
              showStatus={group !== "status"}
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ------------------------------------------------------------------ */
/* Column                                                              */
/* ------------------------------------------------------------------ */

function BoardColumn({
  column,
  group,
  dragEnabled,
  onOpenTask,
}: {
  column: TaskGroupColumn;
  group: TaskViewProps["group"];
  dragEnabled: boolean;
  onOpenTask: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    disabled: !dragEnabled,
  });

  return (
    <section
      className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30"
      aria-label={`${column.label} column`}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        {column.accent}
        <h3 className="text-sm font-semibold text-foreground">
          {column.label}
        </h3>
        <span className="ml-auto rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums">
          {column.tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors duration-150",
          isOver &&
            "rounded-b-xl bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] ring-1 ring-inset ring-primary/40",
        )}
      >
        {column.tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground/70">
            No tasks
          </p>
        ) : (
          column.tasks.map((t) =>
            dragEnabled ? (
              <DraggableCard
                key={t.id}
                task={t}
                group={group}
                onOpenTask={onOpenTask}
              />
            ) : (
              <TaskCard
                key={t.id}
                task={t}
                onOpenTask={onOpenTask}
                showStatus={group !== "status"}
              />
            ),
          )
        )}
      </div>
    </section>
  );
}

function DraggableCard({
  task,
  group,
  onOpenTask,
}: {
  task: ProjectTask;
  group: TaskViewProps["group"];
  onOpenTask: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="touch-none focus-visible:outline-none"
    >
      <TaskCard
        task={task}
        onOpenTask={onOpenTask}
        showStatus={group !== "status"}
        dragging={isDragging}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column ↔ field mapping                                              */
/* ------------------------------------------------------------------ */

/** Whether a task already belongs to the column keyed by `rawKey`. */
function sameColumn(
  task: ProjectTask,
  group: TaskViewProps["group"],
  rawKey: string,
): boolean {
  const key = rawKey === NONE_GROUP_KEY ? null : rawKey;
  switch (group) {
    case "status":
      return task.status === key;
    case "assignee":
      return (task.assigneeId ?? NONE_GROUP_KEY) === rawKey;
    case "priority":
      return task.priority === key;
    case "milestone":
      return (task.milestoneId ?? null) === key;
    default:
      return true;
  }
}

/** Translate a target column key into the PATCH body for the grouped field. */
function columnPatch(
  group: TaskViewProps["group"],
  rawKey: string,
): Partial<{
  status: ProjectTaskStatus;
  assigneeId: string | null;
  priority: ProjectTaskPriority;
  milestoneId: string | null;
}> | null {
  const key = rawKey === NONE_GROUP_KEY ? null : rawKey;
  switch (group) {
    case "status":
      return key ? { status: key as ProjectTaskStatus } : null;
    case "assignee":
      return { assigneeId: key };
    case "priority":
      return { priority: (key ?? "none") as ProjectTaskPriority };
    case "milestone":
      return { milestoneId: key };
    default:
      return null;
  }
}
