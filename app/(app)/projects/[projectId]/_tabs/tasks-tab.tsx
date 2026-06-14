"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks } from "lucide-react";

import { useProjectTasks } from "@/hooks/use-project-tasks";
import type {
  ProjectTaskGroup,
  ProjectTaskListParams,
  ProjectTaskSort,
} from "@/hooks/use-project-tasks";
import { useProjectMembers } from "@/hooks/use-project-members";
import { useProjectMilestones } from "@/hooks/use-project-milestones";
import { useProjectLabels } from "@/hooks/use-task-labels";
import type { TaskView } from "@/components/app/tasks";

import { EmptyState, ListSkeleton } from "./shared";
import {
  TaskToolbar,
  EMPTY_TASK_FILTERS,
  type TaskFilters,
} from "./_task/task-toolbar";
import { TaskQuickAdd } from "./_task/task-quick-add";
import { TaskDetailSheet } from "./_task/task-detail-sheet";
import { TaskBoard } from "./_task/views/task-board";
import { TaskList } from "./_task/views/task-list";
import { TaskTable } from "./_task/views/task-table";

/* ------------------------------------------------------------------ */
/* Persisted view preferences (per project, in localStorage).          */
/* The selected task lives in the URL (?task=) — it is intentionally    */
/* NOT persisted here so a detail sheet is deep-linkable + shareable.   */
/* ------------------------------------------------------------------ */

interface TaskTabPrefs {
  view: TaskView;
  group: ProjectTaskGroup;
  sort: ProjectTaskSort;
  dir: "asc" | "desc";
  filters: TaskFilters;
}

const DEFAULT_PREFS: TaskTabPrefs = {
  view: "board",
  group: "status",
  sort: "manual",
  dir: "asc",
  filters: EMPTY_TASK_FILTERS,
};

const PREFS_KEY = (projectId: string) => `sanctum:tasks-tab:${projectId}`;

/** Read persisted prefs for a project, merged over the defaults. Tolerant of
 * malformed/partial JSON so a bad stored value never breaks the tab. */
function loadPrefs(projectId: string): TaskTabPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY(projectId));
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<TaskTabPrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      filters: { ...EMPTY_TASK_FILTERS, ...(parsed.filters ?? {}) },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/* ------------------------------------------------------------------ */
/* Filters → flexible-list query params (spec §3.6).                    */
/* Drop empty facets so each distinct, meaningful combination caches    */
/* under its own key and the querystring stays clean.                   */
/* ------------------------------------------------------------------ */

function toListParams(
  group: ProjectTaskGroup,
  sort: ProjectTaskSort,
  dir: "asc" | "desc",
  filters: TaskFilters,
): ProjectTaskListParams {
  const params: ProjectTaskListParams = { group, sort, dir };
  if (filters.status.length) params.status = filters.status;
  if (filters.assignee.length) params.assignee = filters.assignee;
  if (filters.priority.length) params.priority = filters.priority;
  if (filters.label.length) params.label = filters.label;
  if (filters.milestone.length) params.milestone = filters.milestone;
  if (filters.due) params.due = filters.due;
  if (filters.q.trim()) params.q = filters.q.trim();
  return params;
}

/* ------------------------------------------------------------------ */
/* Tasks tab — thin integration shell (spec §4.2).                      */
/* Owns view/group/sort/filter state (persisted per project) + the      */
/* selected task (URL ?task=), runs ONE flexible-list query, and wires   */
/* the toolbar → active view → quick-add → detail sheet together.        */
/* ------------------------------------------------------------------ */

export function TasksTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ---- selected task: source of truth is the URL (?task=<id>) ---- */
  const taskId = searchParams.get("task");

  const setTask = React.useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("task", id);
      else params.delete("task");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  /* ---- view prefs: hydrated from localStorage on mount, then persisted ---- */
  const [prefs, setPrefs] = React.useState<TaskTabPrefs>(DEFAULT_PREFS);
  const hydrated = React.useRef(false);

  // Hydrate once on the client (avoids an SSR/first-render localStorage read).
  React.useEffect(() => {
    setPrefs(loadPrefs(projectId));
    hydrated.current = true;
  }, [projectId]);

  // Persist after hydration so the initial default never clobbers a saved value.
  React.useEffect(() => {
    if (!hydrated.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREFS_KEY(projectId), JSON.stringify(prefs));
    } catch {
      /* storage full / blocked — preferences are best-effort. */
    }
  }, [projectId, prefs]);

  const { view, group, sort, dir, filters } = prefs;

  const setView = React.useCallback(
    (next: TaskView) => setPrefs((p) => ({ ...p, view: next })),
    [],
  );
  const setGroup = React.useCallback(
    (next: ProjectTaskGroup) => setPrefs((p) => ({ ...p, group: next })),
    [],
  );
  const setFilters = React.useCallback(
    (next: TaskFilters) => setPrefs((p) => ({ ...p, filters: next })),
    [],
  );
  const setSort = React.useCallback(
    (nextSort: ProjectTaskSort, nextDir: "asc" | "desc") =>
      setPrefs((p) => ({ ...p, sort: nextSort, dir: nextDir })),
    [],
  );

  /* ---- one flexible-list query; views bucket the flat result ---- */
  const listParams = React.useMemo(
    () => toListParams(group, sort, dir, filters),
    [group, sort, dir, filters],
  );
  const { data: tasks, isLoading, isError, refetch } = useProjectTasks(
    projectId,
    listParams,
  );

  // Lookup collections the views need for column labels / accents.
  const { data: members = [] } = useProjectMembers(projectId);
  const { data: milestones = [] } = useProjectMilestones(projectId);
  const { data: labels = [] } = useProjectLabels(projectId);

  // Has the project ANY tasks at all (vs. a filter that hides everything)?
  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.assignee.length > 0 ||
    filters.priority.length > 0 ||
    filters.label.length > 0 ||
    filters.milestone.length > 0 ||
    filters.due !== null ||
    filters.q.trim().length > 0;

  const list = tasks ?? [];
  const isEmpty = !isLoading && !isError && list.length === 0;

  /* ---- the active view, sharing one task list + onOpenTask ---- */
  const viewProps = {
    projectId,
    tasks: list,
    group,
    members,
    milestones,
    labels,
    onOpenTask: setTask,
  };

  return (
    <div className="space-y-4">
      <TaskToolbar
        projectId={projectId}
        view={view}
        onViewChange={setView}
        group={group}
        onGroupChange={setGroup}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        dir={dir}
        onSortChange={setSort}
      />

      {/* Inline quick-add — always available so adding the first task is one
          keystroke away even from the empty state. */}
      <TaskQuickAdd projectId={projectId} defaultStatus="backlog" />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <EmptyState
          icon={<ListChecks className="size-5" />}
          title="Couldn't load tasks"
          description="The connection may have dropped. Retry to fetch the latest tasks."
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium transition-colors duration-150 hover:bg-muted"
            >
              Retry
            </button>
          }
        />
      ) : isEmpty ? (
        hasActiveFilters ? (
          <EmptyState
            icon={<ListChecks className="size-5" />}
            title="No tasks match these filters"
            description="Try clearing or loosening the filters in the toolbar above to see more tasks."
            action={
              <button
                type="button"
                onClick={() => setFilters(EMPTY_TASK_FILTERS)}
                className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium transition-colors duration-150 hover:bg-muted"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<ListChecks className="size-5" />}
            title="No tasks yet"
            description="Break the project into tasks with the quick-add above — assign owners, set priorities and due dates, then track them on the board."
          />
        )
      ) : view === "board" ? (
        <div className="flex min-h-[24rem] flex-col">
          <TaskBoard {...viewProps} />
        </div>
      ) : view === "list" ? (
        <TaskList {...viewProps} />
      ) : (
        <TaskTable {...viewProps} />
      )}

      {/* Deep-linkable detail sheet — mounted ahead of selection so it can
          animate open; visibility is driven entirely by ?task=. */}
      <TaskDetailSheet
        projectId={projectId}
        taskId={taskId}
        open={!!taskId}
        onOpenChange={(open) => {
          if (!open) setTask(null);
        }}
        onOpenTask={setTask}
      />
    </div>
  );
}
