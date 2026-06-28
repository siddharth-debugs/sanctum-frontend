"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  GitPullRequestArrow,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AssigneeStack,
  DueChip,
  LabelChip,
  PriorityIcon,
  StatusBadge,
  taskAssigneePeople,
} from "@/components/app/tasks";
import {
  formatEstimate,
  PRIORITY_RANK,
  TASK_STATUSES,
} from "@/lib/constants/project-options";
import { buildGroups, type TaskViewProps } from "./task-grouping";
import type { ProjectTask } from "@/lib/api/types";

/** Columns the dense table sorts on. */
type SortKey =
  | "title"
  | "status"
  | "priority"
  | "assignee"
  | "due"
  | "estimate"
  | "subtasks";

const STATUS_RANK: Record<string, number> = Object.fromEntries(
  TASK_STATUSES.map((s, i) => [s.value, i]),
);

interface ColumnDef {
  key: SortKey;
  label: string;
  /** Right-align numeric/short columns. */
  align?: "left" | "right";
  /** Hide below a breakpoint to stay dense on narrow widths. */
  hideClass?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "title", label: "Title" },
  { key: "status", label: "Status", hideClass: "hidden sm:table-cell" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee", hideClass: "hidden md:table-cell" },
  { key: "due", label: "Due", hideClass: "hidden sm:table-cell" },
  {
    key: "estimate",
    label: "Est.",
    align: "right",
    hideClass: "hidden lg:table-cell",
  },
  { key: "subtasks", label: "Subtasks", align: "right", hideClass: "hidden lg:table-cell" },
];

/** Comparator for a sort key (asc); callers flip for desc. */
function compare(a: ProjectTask, b: ProjectTask, key: SortKey): number {
  switch (key) {
    case "title":
      return a.title.localeCompare(b.title);
    case "status":
      return (STATUS_RANK[a.status] ?? 0) - (STATUS_RANK[b.status] ?? 0);
    case "priority":
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case "assignee":
      return (a.assigneeName ?? "").localeCompare(b.assigneeName ?? "");
    case "due": {
      const av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return av - bv;
    }
    case "estimate":
      return (a.estimateMinutes ?? 0) - (b.estimateMinutes ?? 0);
    case "subtasks":
      return (a.subtaskCount ?? 0) - (b.subtaskCount ?? 0);
    default:
      return 0;
  }
}

/**
 * Table view (spec §4.2). A dense, sortable table — Title · Status · Priority ·
 * Assignee · Due · Estimate · Subtasks · Blocked. Clicking a header sorts on
 * that column (toggling asc/desc); clicking a row opens the detail sheet. When a
 * group is active, group subheaders split the body; otherwise it's one flat
 * table. Counts use `tabular-nums`; the Blocked flag pairs an icon with text.
 */
export function TaskTable({
  tasks,
  group,
  members,
  milestones,
  labels,
  onOpenTask,
}: TaskViewProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("title");
  const [dir, setDir] = React.useState<"asc" | "desc">("asc");

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDir("asc");
    }
  };

  const sortWithin = React.useCallback(
    (list: ProjectTask[]) => {
      const sorted = [...list].sort((a, b) => compare(a, b, sortKey));
      return dir === "desc" ? sorted.reverse() : sorted;
    },
    [sortKey, dir],
  );

  const grouped = group !== "none";
  const columns = React.useMemo(
    () => buildGroups(tasks, group, { members, milestones, labels }),
    [tasks, group, members, milestones, labels],
  );

  const colSpan = COLUMNS.length + 1; // + the Blocked flag column

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((c) => {
              const active = c.key === sortKey;
              return (
                <TableHead
                  key={c.key}
                  className={cn(
                    "h-9 select-none",
                    c.align === "right" && "text-right",
                    c.hideClass,
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSort(c.key)}
                    aria-label={`Sort by ${c.label}`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      c.align === "right" && "flex-row-reverse",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.label}
                    {active ? (
                      dir === "asc" ? (
                        <ArrowUp className="size-3" aria-hidden />
                      ) : (
                        <ArrowDown className="size-3" aria-hidden />
                      )
                    ) : (
                      <ChevronsUpDown
                        className="size-3 opacity-40"
                        aria-hidden
                      />
                    )}
                  </button>
                </TableHead>
              );
            })}
            <TableHead className="h-9 w-10 text-right">
              <span className="sr-only">Blocked</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {tasks.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={colSpan}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No tasks match the current filters.
              </TableCell>
            </TableRow>
          ) : grouped ? (
            columns.map((col) => (
              <React.Fragment key={col.key}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={colSpan}
                    className="py-1.5 text-xs font-semibold text-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      {col.accent}
                      {col.label}
                      <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                        {col.tasks.length}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
                {sortWithin(col.tasks).map((t) => (
                  <Row key={t.id} task={t} onOpenTask={onOpenTask} />
                ))}
              </React.Fragment>
            ))
          ) : (
            sortWithin(tasks).map((t) => (
              <Row key={t.id} task={t} onOpenTask={onOpenTask} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function Row({
  task,
  onOpenTask,
}: {
  task: ProjectTask;
  onOpenTask: (taskId: string) => void;
}) {
  const isDone = task.status === "done";
  const labels = task.labels ?? [];
  const subtaskTotal = task.subtaskCount ?? 0;
  const subtaskDone = task.subtaskDoneCount ?? 0;
  const blockedBy = task.blockedByCount ?? 0;

  return (
    <TableRow
      role="button"
      tabIndex={0}
      aria-label={`Open task: ${task.title}`}
      onClick={() => onOpenTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onOpenTask(task.id);
        }
      }}
      className="cursor-pointer"
    >
      {/* Title + inline labels. */}
      <TableCell className="max-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          {labels.slice(0, 2).map((l) => (
            <LabelChip key={l.id} label={l} className="hidden xl:inline-flex" />
          ))}
        </div>
      </TableCell>

      {/* Status. */}
      <TableCell className="hidden sm:table-cell">
        <StatusBadge status={task.status} />
      </TableCell>

      {/* Priority. */}
      <TableCell>
        <span className="inline-flex items-center gap-1.5">
          <PriorityIcon priority={task.priority} hideLabel />
        </span>
      </TableCell>

      {/* Assignee(s). */}
      <TableCell className="hidden md:table-cell">
        {(() => {
          const people = taskAssigneePeople(task);
          return people.length > 0 ? (
            <AssigneeStack
              assignees={people}
              size="sm"
              showName={people.length === 1}
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        })()}
      </TableCell>

      {/* Due. */}
      <TableCell className="hidden sm:table-cell">
        <DueChip date={task.dueDate} />
      </TableCell>

      {/* Estimate. */}
      <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground lg:table-cell">
        {formatEstimate(task.estimateMinutes)}
      </TableCell>

      {/* Subtasks. */}
      <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground lg:table-cell">
        {subtaskTotal > 0 ? `${subtaskDone}/${subtaskTotal}` : "—"}
      </TableCell>

      {/* Blocked flag. */}
      <TableCell className="text-right">
        {blockedBy > 0 ? (
          <span
            className="inline-flex items-center text-destructive"
            title={`Blocked by ${blockedBy} task${blockedBy === 1 ? "" : "s"}`}
          >
            <GitPullRequestArrow className="size-4" aria-hidden />
            <span className="sr-only">Blocked by {blockedBy}</span>
          </span>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
