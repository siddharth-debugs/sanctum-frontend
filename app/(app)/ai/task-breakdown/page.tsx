"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { ListChecks, Sparkles, Plus, Layers, Inbox } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { TASK_STATUSES } from "@/lib/constants/project-options";
import type { ProjectTask, ProjectTaskStatus } from "@/lib/api/types";

import { useProjects } from "@/hooks/use-projects";
import {
  useProjectTasks,
  useCreateProjectTask,
  useUpdateProjectTask,
  useDeleteProjectTask,
  useBulkCreateProjectTasks,
} from "@/hooks/use-project-tasks";
import {
  useProjectMilestones,
  useCreateProjectMilestone,
} from "@/hooks/use-project-milestones";
import { useGenerateBreakdown } from "@/hooks/use-ai";

import { TaskCardBody } from "@/components/app/task-breakdown/task-card";
import {
  BoardCell,
  cellId,
  parseCellId,
} from "@/components/app/task-breakdown/board-cell";

/** A matrix row: a real milestone, or the synthetic "Unassigned" bucket. */
interface Row {
  id: string | null;
  title: string;
}

export default function TaskBreakdownPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <React.Suspense fallback={null}>
        <Board />
      </React.Suspense>
    </div>
  );
}

function Board() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const projectsQuery = useProjects();
  const projects = React.useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );

  // Selected project: ?project= param, falling back to the first project.
  const paramId = searchParams.get("project") ?? "";
  const projectId =
    paramId && projects.some((p) => p.id === paramId)
      ? paramId
      : (projects[0]?.id ?? "");

  const setProject = React.useCallback(
    (id: string) => {
      const next = new URLSearchParams(Array.from(searchParams.entries()));
      next.set("project", id);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const tasksQuery = useProjectTasks(projectId);
  const milestonesQuery = useProjectMilestones(projectId);

  const createTask = useCreateProjectTask(projectId);
  const updateTask = useUpdateProjectTask(projectId);
  const deleteTask = useDeleteProjectTask(projectId);
  const bulkCreate = useBulkCreateProjectTasks(projectId);
  const createMilestone = useCreateProjectMilestone(projectId);
  const generate = useGenerateBreakdown();

  const tasks = tasksQuery.data ?? [];
  const milestones = milestonesQuery.data ?? [];

  // Rows = each milestone (in position order) + a trailing Unassigned bucket.
  const rows = React.useMemo<Row[]>(() => {
    const sorted = [...milestones].sort((a, b) => a.position - b.position);
    const milestoneRows: Row[] = sorted.map((m) => ({
      id: m.id,
      title: m.title,
    }));
    return [...milestoneRows, { id: null, title: "Unassigned" }];
  }, [milestones]);

  // Group tasks by `${milestoneId}:${status}` for O(1) cell lookups.
  const byCell = React.useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const t of tasks) {
      const key = cellId(t.milestoneId, t.status);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [tasks]);

  // Per-column totals across all rows.
  const columnCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [tasks]);

  // ---- Drag & drop -------------------------------------------------------
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
      if (!overId) return;

      const { milestoneId, status } = parseCellId(String(overId));
      const current = tasks.find((t) => t.id === taskId);
      if (!current) return;
      if (current.milestoneId === milestoneId && current.status === status) {
        return; // dropped back into the same cell
      }

      // Optimistic move: rewrite the cached task immediately.
      const key = queryKeys.projectTasks(projectId);
      const prev = qc.getQueryData<ProjectTask[]>(key);
      qc.setQueryData<ProjectTask[]>(key, (old) =>
        (old ?? []).map((t) =>
          t.id === taskId ? { ...t, milestoneId, status } : t,
        ),
      );

      updateTask.mutate(
        { taskId, input: { milestoneId, status } },
        {
          onError: (err) => {
            if (prev) qc.setQueryData(key, prev); // roll back
            toast.error(
              err instanceof ApiError ? err.message : "Couldn't move task",
            );
          },
        },
      );
    },
    [tasks, projectId, qc, updateTask],
  );

  // ---- Cell mutations ----------------------------------------------------
  const handleAdd = React.useCallback(
    (milestoneId: string | null, status: ProjectTaskStatus, title: string) => {
      createTask.mutate(
        { title, milestoneId, status },
        {
          onError: (err) =>
            toast.error(
              err instanceof ApiError ? err.message : "Couldn't add task",
            ),
        },
      );
    },
    [createTask],
  );

  const handleBulkAdd = React.useCallback(
    (
      milestoneId: string | null,
      status: ProjectTaskStatus,
      titles: string[],
    ) => {
      bulkCreate.mutate(
        { titles, milestoneId, status },
        {
          onSuccess: (created) =>
            toast.success(`Added ${created.length} tasks`),
          onError: (err) =>
            toast.error(
              err instanceof ApiError ? err.message : "Couldn't add tasks",
            ),
        },
      );
    },
    [bulkCreate],
  );

  const handleDelete = React.useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId, {
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't delete task",
          ),
      });
    },
    [deleteTask],
  );

  const onGenerate = React.useCallback(() => {
    if (!projectId) return;
    generate.mutate({ projectId });
  }, [generate, projectId]);

  // ---- Add-milestone row -------------------------------------------------
  const [addingMilestone, setAddingMilestone] = React.useState(false);
  const [milestoneTitle, setMilestoneTitle] = React.useState("");

  const commitMilestone = React.useCallback(() => {
    const title = milestoneTitle.trim();
    if (!title) {
      setAddingMilestone(false);
      setMilestoneTitle("");
      return;
    }
    createMilestone.mutate(
      { title },
      {
        onSuccess: () => {
          setMilestoneTitle("");
          setAddingMilestone(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add milestone",
          ),
      },
    );
  }, [milestoneTitle, createMilestone]);

  const loading = tasksQuery.isLoading || milestonesQuery.isLoading;
  const isEmpty =
    !loading && milestones.length === 0 && tasks.length === 0;

  const header = (
    <PageHeader
      className="pb-4"
      kicker={
        <>
          <ListChecks className="size-3" /> Task Breakdown
        </>
      }
      title="Task Breakdown"
      description="Rows are milestones, columns are status. Drag a card across cells to update both at once."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {projectsQuery.isLoading ? (
            <Skeleton className="h-9 w-56" />
          ) : (
            <Select value={projectId} onValueChange={setProject}>
              <SelectTrigger className="w-56" size="default">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="rounded-full border bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {milestones.length} milestones · {tasks.length} tasks
          </span>
          <Button
            variant="accent"
            onClick={onGenerate}
            disabled={!projectId || generate.isPending}
          >
            <Sparkles className="size-4" />
            {generate.isPending ? "Generating…" : "Generate with AI"}
          </Button>
        </div>
      }
    />
  );

  // ---- Empty / no-project states ----------------------------------------
  if (!projectsQuery.isLoading && projects.length === 0) {
    return (
      <>
        {header}
        <EmptyCard
          icon={<Inbox className="size-7" />}
          title="No projects yet"
          body="Create a project first — then plan it out here as a milestone × status board."
        />
      </>
    );
  }

  return (
    <>
      {header}

      {!projectId ? (
        <EmptyCard
          icon={<Inbox className="size-7" />}
          title="Pick a project"
          body="Choose a project above to view and plan its milestones and tasks."
        />
      ) : loading ? (
        <Card className="flex-1 items-center justify-center gap-3 py-20 text-center">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </Card>
      ) : isEmpty ? (
        <EmptyCard
          icon={<Sparkles className="size-7" />}
          title="Nothing here yet"
          body="Let AI draft a milestone-and-task plan for this project — then drag, add, and refine."
          action={
            <Button
              variant="accent"
              onClick={onGenerate}
              disabled={generate.isPending}
            >
              <Sparkles className="size-4" />
              {generate.isPending ? "Generating…" : "Generate with AI"}
            </Button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card/40">
            <div
              className="grid min-w-[60rem]"
              style={{
                gridTemplateColumns: `14rem repeat(${TASK_STATUSES.length}, minmax(11rem, 1fr))`,
              }}
            >
              {/* Sticky header row: corner + status columns. */}
              <div className="sticky top-0 left-0 z-30 border-r border-b bg-card px-3 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Milestone
                </span>
              </div>
              {TASK_STATUSES.map((s) => (
                <div
                  key={s.value}
                  className="sticky top-0 z-20 border-b bg-card px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: s.dot }}
                    />
                    <span className="text-[13px] font-semibold text-foreground">
                      {s.label}
                    </span>
                    <span className="ml-auto rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                      {columnCounts[s.value] ?? 0}
                    </span>
                  </div>
                </div>
              ))}

              {/* Milestone rows. */}
              {rows.map((row) => (
                <BoardRow
                  key={row.id ?? "__unassigned__"}
                  row={row}
                  tasks={tasks}
                  byCell={byCell}
                  onAdd={handleAdd}
                  onBulkAdd={handleBulkAdd}
                  onDeleteTask={handleDelete}
                  busy={createTask.isPending || bulkCreate.isPending}
                />
              ))}
            </div>

            {/* Add-milestone control under the matrix. */}
            <div className="border-t bg-card/60 p-2">
              {addingMilestone ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={milestoneTitle}
                    disabled={createMilestone.isPending}
                    placeholder="Milestone title…"
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitMilestone();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setAddingMilestone(false);
                        setMilestoneTitle("");
                      }
                    }}
                    className="h-8 w-64 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
                  />
                  <Button
                    size="sm"
                    onClick={commitMilestone}
                    disabled={createMilestone.isPending}
                  >
                    Add row
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingMilestone(false);
                      setMilestoneTitle("");
                    }}
                    disabled={createMilestone.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingMilestone(true)}
                >
                  <Plus className="size-4" /> Add Milestone Row
                </Button>
              )}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? <TaskCardBody task={activeTask} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
}

/** A single milestone (or Unassigned) row: sticky header cell + 5 status cells. */
function BoardRow({
  row,
  tasks,
  byCell,
  onAdd,
  onBulkAdd,
  onDeleteTask,
  busy,
}: {
  row: Row;
  tasks: ProjectTask[];
  byCell: Map<string, ProjectTask[]>;
  onAdd: (
    milestoneId: string | null,
    status: ProjectTaskStatus,
    title: string,
  ) => void;
  onBulkAdd: (
    milestoneId: string | null,
    status: ProjectTaskStatus,
    titles: string[],
  ) => void;
  onDeleteTask: (taskId: string) => void;
  busy?: boolean;
}) {
  // Per-row done/total for the progress bar.
  const rowTasks = tasks.filter((t) => t.milestoneId === row.id);
  const total = rowTasks.length;
  const done = rowTasks.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isUnassigned = row.id === null;

  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center gap-1.5 border-r border-b bg-card px-3 py-3">
        <div className="flex items-center gap-1.5">
          {isUnassigned ? (
            <Inbox className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Layers className="size-3.5 shrink-0 text-primary" />
          )}
          <span
            className={cn(
              "line-clamp-2 text-[13px] font-semibold",
              isUnassigned ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {row.title}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {done}/{total} tasks
        </span>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-[width]"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg,var(--primary),color-mix(in srgb,var(--accent) 70%,var(--primary)))",
            }}
          />
        </div>
      </div>

      {TASK_STATUSES.map((s) => (
        <div key={s.value} className="border-b">
          <BoardCell
            milestoneId={row.id}
            status={s.value}
            tasks={byCell.get(cellId(row.id, s.value)) ?? []}
            onDeleteTask={onDeleteTask}
            onAdd={(title) => onAdd(row.id, s.value, title)}
            onBulkAdd={(titles) => onBulkAdd(row.id, s.value, titles)}
            busy={busy}
          />
        </div>
      ))}
    </>
  );
}

function EmptyCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex-1 items-center justify-center gap-4 py-20 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </Card>
  );
}
