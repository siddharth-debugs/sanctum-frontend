"use client";

import * as React from "react";
import {
  Check,
  ChevronRight,
  GitPullRequestArrow,
  ListChecks,
  MessageSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AssigneeStack,
  DueChip,
  LabelChip,
  PrioritySelect,
  StatusSelect,
  taskAssigneePeople,
} from "@/components/app/tasks";
import { buildGroups, type TaskViewProps } from "./task-grouping";
import { useUpdateProjectTask } from "@/hooks/use-project-tasks";
import type {
  ProjectTask,
  ProjectMember,
  ProjectTaskStatus,
} from "@/lib/api/types";

/**
 * List view (spec §4.2). Grouped collapsible sections (driven by the active
 * `group`); within each, top-level tasks render as inline-editable rows with
 * their subtasks indented below. Status / priority / assignee / due edit in
 * place via the shared atoms; clicking the title opens the detail sheet. The
 * done checkbox flips status ⇄ done. All edits are optimistic.
 */
export function TaskList({
  projectId,
  tasks,
  group,
  members,
  milestones,
  labels,
  onOpenTask,
}: TaskViewProps) {
  const updateTask = useUpdateProjectTask(projectId);

  // Index subtasks by parent so each top-level row can nest its children.
  const subtasksByParent = React.useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const t of tasks) {
      if (!t.parentTaskId) continue;
      const arr = map.get(t.parentTaskId);
      if (arr) arr.push(t);
      else map.set(t.parentTaskId, [t]);
    }
    for (const arr of map.values())
      arr.sort((a, b) => a.position - b.position);
    return map;
  }, [tasks]);

  // Group only the TOP-LEVEL tasks; subtasks are rendered under their parent.
  const topLevel = React.useMemo(
    () => tasks.filter((t) => !t.parentTaskId),
    [tasks],
  );
  const columns = React.useMemo(
    () => buildGroups(topLevel, group, { members, milestones, labels }),
    [topLevel, group, members, milestones, labels],
  );

  const patch = React.useCallback(
    (
      taskId: string,
      input: Parameters<typeof updateTask.mutate>[0]["input"],
      assigneeNames?: Record<string, string>,
    ) =>
      updateTask.mutate(
        { taskId, input, assigneeNames },
        {
          onError: (err) =>
            toast.error(
              err instanceof ApiError ? err.message : "Couldn't update task",
            ),
        },
      ),
    [updateTask],
  );

  // Collapsed section keys (sections expanded by default).
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const toggleSection = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      {columns.map((col) => {
        const isCollapsed = collapsed.has(col.key);
        return (
          <section key={col.key} aria-label={`${col.label} section`}>
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => toggleSection(col.key)}
              className="mb-2 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
                  !isCollapsed && "rotate-90",
                )}
                aria-hidden
              />
              {col.accent}
              <h3 className="text-sm font-semibold text-foreground">
                {col.label}
              </h3>
              <span className="rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums">
                {col.tasks.length}
              </span>
            </button>

            {!isCollapsed && (
              <div className="divide-y rounded-lg border bg-card">
                {col.tasks.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground/70">
                    No tasks
                  </p>
                ) : (
                  col.tasks.map((t) => (
                    <React.Fragment key={t.id}>
                      <TaskRow
                        task={t}
                        projectId={projectId}
                        members={members}
                        onOpenTask={onOpenTask}
                        onPatch={patch}
                      />
                      {(subtasksByParent.get(t.id) ?? []).map((sub) => (
                        <TaskRow
                          key={sub.id}
                          task={sub}
                          projectId={projectId}
                          members={members}
                          onOpenTask={onOpenTask}
                          onPatch={patch}
                          indented
                        />
                      ))}
                    </React.Fragment>
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function TaskRow({
  task,
  projectId,
  members,
  onOpenTask,
  onPatch,
  indented,
}: {
  task: ProjectTask;
  projectId: string;
  members: ProjectMember[];
  onOpenTask: (taskId: string) => void;
  onPatch: (
    taskId: string,
    input: {
      status?: ProjectTaskStatus;
      priority?: ProjectTask["priority"];
      assigneeIds?: string[] | null;
    },
    assigneeNames?: Record<string, string>,
  ) => void;
  indented?: boolean;
}) {
  const isDone = task.status === "done";
  const subtaskTotal = task.subtaskCount ?? 0;
  const subtaskDone = task.subtaskDoneCount ?? 0;
  const blockedBy = task.blockedByCount ?? 0;
  const comments = task.commentCount ?? 0;
  const labels = task.labels ?? [];

  return (
    <div
      className={cn(
        "group/row flex items-center gap-2 px-3 py-2 transition-colors duration-150 hover:bg-muted/40",
        indented && "pl-9",
      )}
    >
      {/* Done toggle. */}
      <Checkbox
        checked={isDone}
        aria-label={isDone ? "Mark as not done" : "Mark as done"}
        onCheckedChange={(c) =>
          onPatch(task.id, { status: c ? "done" : "todo" })
        }
        className="shrink-0"
      />

      {/* Title → opens sheet. */}
      <button
        type="button"
        onClick={() => onOpenTask(task.id)}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-sm font-medium transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDone && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </button>

      {/* Labels (hidden on very narrow rows). */}
      {labels.length > 0 && (
        <span className="hidden max-w-40 shrink-0 flex-wrap items-center gap-1.5 lg:flex">
          {labels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </span>
      )}

      {/* Counts meta. */}
      <span className="hidden shrink-0 items-center gap-2.5 text-xs text-muted-foreground sm:flex">
        {subtaskTotal > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums" title="Subtasks">
            <ListChecks className="size-3.5" aria-hidden />
            {subtaskDone}/{subtaskTotal}
          </span>
        )}
        {blockedBy > 0 && (
          <span
            className="inline-flex items-center gap-1 font-medium text-destructive"
            title={`Blocked by ${blockedBy}`}
          >
            <GitPullRequestArrow className="size-3.5" aria-hidden />
            Blocked
          </span>
        )}
        {comments > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums" title="Comments">
            <MessageSquare className="size-3.5" aria-hidden />
            {comments}
          </span>
        )}
      </span>

      {/* Inline-edit controls. */}
      <span className="shrink-0">
        <DueChip date={task.dueDate} hideWhenEmpty />
      </span>
      <span className="hidden shrink-0 md:block">
        <PrioritySelect
          value={task.priority}
          onChange={(p) => onPatch(task.id, { priority: p })}
          iconOnly
          aria-label={`Priority for ${task.title}`}
        />
      </span>
      <AssigneePopover
        members={members}
        task={task}
        onChange={(ids, names) =>
          onPatch(task.id, { assigneeIds: ids }, names)
        }
      />
      <span className="hidden shrink-0 sm:block">
        <StatusSelect
          value={task.status}
          onChange={(s) => onPatch(task.id, { status: s })}
          aria-label={`Status for ${task.title}`}
        />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline assignee picker — multi-select; the trigger shows an avatar    */
/* stack and clicking a member toggles them.                             */
/* ------------------------------------------------------------------ */

function AssigneePopover({
  members,
  task,
  onChange,
}: {
  members: ProjectMember[];
  task: ProjectTask;
  /** Replace the whole set; `names` carries id→name for optimistic writes. */
  onChange: (ids: string[], names: Record<string, string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const people = taskAssigneePeople(task);
  const selectedIds = React.useMemo(
    () => people.map((p) => p.userId),
    [people],
  );
  const selectedSet = React.useMemo(
    () => new Set(selectedIds),
    [selectedIds],
  );
  const nameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.userId] = m.userName;
    return map;
  }, [members]);

  function commit(ids: string[]) {
    onChange(ids, nameMap);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Assignees for ${task.title}: ${
            people.length > 0
              ? people.map((p) => p.name).join(", ")
              : "unassigned"
          }`}
          className="grid h-8 min-w-8 shrink-0 place-items-center rounded-md px-1 transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AssigneeStack assignees={people} size="sm" max={3} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Assign to…" />
          <CommandList>
            <CommandEmpty>No members.</CommandEmpty>
            <CommandGroup>
              {members.map((m) => {
                const checked = selectedSet.has(m.userId);
                return (
                  <CommandItem
                    key={m.userId}
                    value={m.userName}
                    aria-selected={checked}
                    onSelect={() =>
                      commit(
                        checked
                          ? selectedIds.filter((id) => id !== m.userId)
                          : [...selectedIds, m.userId],
                      )
                    }
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        checked ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <AssigneeStack
                      assignees={[{ userId: m.userId, name: m.userName }]}
                      size="sm"
                      showName
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedIds.length > 0 && (
              <CommandGroup className="border-t">
                <CommandItem
                  value="__unassign_all__"
                  onSelect={() => {
                    commit([]);
                    setOpen(false);
                  }}
                  className="gap-2 text-muted-foreground"
                >
                  <X className="size-4" />
                  Unassign all
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
