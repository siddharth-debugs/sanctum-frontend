"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import type { ProjectTask, ProjectTaskStatus } from "@/lib/api/types";

/** Build the stable droppable id for a (milestone, status) cell. */
export function cellId(milestoneId: string | null, status: ProjectTaskStatus) {
  return `${milestoneId ?? "none"}:${status}`;
}

/** Parse a droppable id back into its milestone + status parts. */
export function parseCellId(id: string): {
  milestoneId: string | null;
  status: ProjectTaskStatus;
} {
  const idx = id.lastIndexOf(":");
  const rawMilestone = id.slice(0, idx);
  const status = id.slice(idx + 1) as ProjectTaskStatus;
  return {
    milestoneId: rawMilestone === "none" ? null : rawMilestone,
    status,
  };
}

export function BoardCell({
  milestoneId,
  status,
  tasks,
  onDeleteTask,
  onAdd,
  onBulkAdd,
  busy,
}: {
  milestoneId: string | null;
  status: ProjectTaskStatus;
  tasks: ProjectTask[];
  onDeleteTask: (taskId: string) => void;
  /** Single-line create. */
  onAdd: (title: string) => void;
  /** Multi-line (pasted list) create. */
  onBulkAdd: (titles: string[]) => void;
  busy?: boolean;
}) {
  const id = cellId(milestoneId, status);
  const { setNodeRef, isOver } = useDroppable({ id });

  const [adding, setAdding] = React.useState(false);
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const reset = React.useCallback(() => {
    setValue("");
    setAdding(false);
  }, []);

  const commit = React.useCallback(() => {
    const lines = value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      reset();
      return;
    }
    if (lines.length === 1) {
      onAdd(lines[0]!);
    } else {
      onBulkAdd(lines);
    }
    reset();
  }, [value, onAdd, onBulkAdd, reset]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/cell flex min-h-28 flex-col gap-1.5 p-1.5 transition-colors",
        isOver
          ? "bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] ring-1 ring-inset ring-[var(--primary)]"
          : "hover:bg-[color-mix(in_srgb,var(--muted)_45%,transparent)]",
      )}
    >
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} onDelete={() => onDeleteTask(t.id)} />
      ))}

      {adding ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            ref={inputRef}
            rows={2}
            value={value}
            disabled={busy}
            placeholder="Task title… (paste a list for many)"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                reset();
              }
            }}
            onBlur={() => {
              if (!value.trim()) reset();
            }}
            className="w-full resize-none rounded-md border border-input bg-transparent px-2 py-1.5 text-[13px] leading-snug shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
          />
          <div className="flex items-center gap-1.5">
            <Button size="xs" onClick={commit} disabled={busy}>
              Add
            </Button>
            <Button size="xs" variant="ghost" onClick={reset} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-primary focus-visible:opacity-100 group-hover/cell:opacity-100"
        >
          <Plus className="size-3" /> Add
        </button>
      )}
    </div>
  );
}
