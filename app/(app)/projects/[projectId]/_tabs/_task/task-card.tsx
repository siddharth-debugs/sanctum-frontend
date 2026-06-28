"use client";

import * as React from "react";
import { GitPullRequestArrow, ListChecks, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AssigneeStack,
  DueChip,
  LabelChip,
  PriorityIcon,
  StatusBadge,
  taskAssigneePeople,
} from "@/components/app/tasks";
import type { ProjectTask } from "@/lib/api/types";

export interface TaskCardProps {
  task: ProjectTask;
  /** Open the detail sheet for this task (the shell owns the sheet). */
  onOpenTask: (taskId: string) => void;
  /**
   * Show the status dot on the card. Board columns already group BY status, so
   * the board hides it; the list/ungrouped surfaces show it.
   */
  showStatus?: boolean;
  /** Visually mark the live card being dragged (board). */
  dragging?: boolean;
  /** Render the lifted drag clone (rotated, shadowed, grab cursor). */
  overlay?: boolean;
  className?: string;
}

/**
 * The single task card (spec §4.2 / §6.5) shared by the Board and List views and
 * the drag overlay. Surfaces — in one glance — title, priority glyph, assignee,
 * due chip, label chips, the subtask "3/5" progress, a blocked-by flag and the
 * comment count. Every meta uses a shared atom so the card reads identically
 * everywhere; counts use `tabular-nums`, and the blocked flag carries an icon +
 * text (never colour alone). Clicking anywhere opens the detail sheet.
 */
export const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  function TaskCard(
    { task, onOpenTask, showStatus = false, dragging, overlay, className },
    ref,
  ) {
    const labels = task.labels ?? [];
    const subtaskTotal = task.subtaskCount ?? 0;
    const subtaskDone = task.subtaskDoneCount ?? 0;
    const blockedBy = task.blockedByCount ?? 0;
    const comments = task.commentCount ?? 0;
    const isDone = task.status === "done";
    const assignees = taskAssigneePeople(task);

    const hasFooter =
      assignees.length > 0 ||
      !!task.dueDate ||
      subtaskTotal > 0 ||
      blockedBy > 0 ||
      comments > 0;

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={`Open task: ${task.title}`}
        onClick={() => onOpenTask(task.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenTask(task.id);
          }
        }}
        className={cn(
          "group/card flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-[color,box-shadow,border-color] duration-150",
          "hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging && "opacity-50",
          overlay &&
            "rotate-[1.5deg] cursor-grabbing border-primary/60 shadow-lg ring-1 ring-primary",
          className,
        )}
      >
        {/* Title row: priority glyph + title (+ optional status dot). */}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex items-center gap-1.5">
            {showStatus && <StatusBadge status={task.status} dotOnly />}
            <PriorityIcon priority={task.priority} />
          </span>
          <p
            className={cn(
              "min-w-0 flex-1 text-sm font-medium leading-snug break-words text-foreground",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
        </div>

        {/* Labels. */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => (
              <LabelChip key={l.id} label={l} />
            ))}
          </div>
        )}

        {/* Footer meta: assignee · due · subtasks · blocked · comments. */}
        {hasFooter && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {assignees.length > 0 && (
              <AssigneeStack assignees={assignees} size="sm" />
            )}
            <DueChip date={task.dueDate} hideWhenEmpty />
            {subtaskTotal > 0 && (
              <span
                className="inline-flex items-center gap-1 tabular-nums"
                title={`${subtaskDone} of ${subtaskTotal} subtasks done`}
              >
                <ListChecks className="size-3.5" aria-hidden />
                {subtaskDone}/{subtaskTotal}
              </span>
            )}
            {blockedBy > 0 && (
              <span
                className="inline-flex items-center gap-1 font-medium text-destructive tabular-nums"
                title={`Blocked by ${blockedBy} task${blockedBy === 1 ? "" : "s"}`}
              >
                <GitPullRequestArrow className="size-3.5" aria-hidden />
                Blocked
              </span>
            )}
            {comments > 0 && (
              <span
                className="inline-flex items-center gap-1 tabular-nums"
                title={`${comments} comment${comments === 1 ? "" : "s"}`}
              >
                <MessageSquare className="size-3.5" aria-hidden />
                {comments}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);
