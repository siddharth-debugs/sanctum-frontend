"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CalendarDays, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { TASK_STATUS_DOT } from "@/lib/constants/project-options";
import type { ProjectTask } from "@/lib/api/types";

/** First initial of an assignee name, for the avatar chip. */
function initialOf(name?: string | null): string | null {
  const t = name?.trim();
  return t ? t[0]!.toUpperCase() : null;
}

/** Short "12 Jun" style due-date label. */
function formatDue(due: string | null): string | null {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * The visual body of a task card, shared between the live (draggable) card and
 * the floating <DragOverlay> clone so they look identical while dragging.
 */
export function TaskCardBody({
  task,
  onDelete,
  dragging,
  overlay,
}: {
  task: ProjectTask;
  onDelete?: () => void;
  dragging?: boolean;
  overlay?: boolean;
}) {
  const initial = initialOf(task.assigneeName);
  const due = formatDue(task.dueDate);

  return (
    <div
      className={cn(
        "group/card relative rounded-lg border bg-card px-2.5 py-2 text-left shadow-sm transition-shadow",
        "hover:shadow-md",
        dragging && "opacity-40",
        overlay && "rotate-[1.5deg] cursor-grabbing shadow-lg ring-1 ring-[var(--primary)]",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          aria-hidden
          className="mt-1 size-1.5 shrink-0 rounded-full"
          style={{ background: TASK_STATUS_DOT[task.status] }}
        />
        <p className="min-w-0 flex-1 text-[13px] leading-snug font-medium break-words text-foreground">
          {task.title}
        </p>
        {onDelete && (
          <button
            type="button"
            aria-label="Delete task"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="-mr-0.5 -mt-0.5 grid size-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/card:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {(initial || due) && (
        <div className="mt-1.5 flex items-center gap-1.5 pl-3">
          {initial && (
            <span
              title={task.assigneeName ?? undefined}
              className="grid size-4.5 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[10px] font-semibold text-primary"
            >
              {initial}
            </span>
          )}
          {due && (
            <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <CalendarDays className="size-2.5" />
              {due}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** A draggable task card wired into the @dnd-kit context. */
export function TaskCard({
  task,
  onDelete,
}: {
  task: ProjectTask;
  onDelete: () => void;
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
      className="cursor-grab touch-none active:cursor-grabbing focus-visible:outline-none"
    >
      <TaskCardBody task={task} onDelete={onDelete} dragging={isDragging} />
    </div>
  );
}
