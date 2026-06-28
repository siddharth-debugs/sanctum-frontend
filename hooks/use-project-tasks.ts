"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  ProjectTask,
  ProjectTaskDetail,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@/lib/api/types";

/** group-by axis the server can bucket on (client still buckets a flat list). */
export type ProjectTaskGroup =
  | "status"
  | "assignee"
  | "priority"
  | "label"
  | "milestone"
  | "none";

/** sort axis for the flexible list. */
export type ProjectTaskSort =
  | "manual"
  | "priority"
  | "due"
  | "created"
  | "updated"
  | "title";

/** due-date preset filter. */
export type ProjectTaskDueFilter = "overdue" | "today" | "week" | "none";

/**
 * Composable params for GET /projects/:id/tasks (spec §3.6). All optional and
 * stable-serialized into the query key so each combination is cached separately.
 * The server returns a FLAT enriched list; views bucket it client-side.
 */
export interface ProjectTaskListParams {
  group?: ProjectTaskGroup;
  /** Multi-select filters (arrays serialize to repeated `key[]` params). */
  status?: ProjectTaskStatus[];
  /** User ids or the literal "unassigned". */
  assignee?: string[];
  priority?: ProjectTaskPriority[];
  /** Label ids. */
  label?: string[];
  /** Milestone ids. */
  milestone?: string[];
  due?: ProjectTaskDueFilter;
  /** Title contains. */
  q?: string;
  sort?: ProjectTaskSort;
  dir?: "asc" | "desc";
  /** Include subtasks in the flat list (default true). */
  includeSubtasks?: boolean;
}

/** Build the querystring for the flexible list endpoint. */
function buildTaskListQuery(params: ProjectTaskListParams): string {
  const sp = new URLSearchParams();
  if (params.group) sp.set("group", params.group);
  for (const s of params.status ?? []) sp.append("status[]", s);
  for (const a of params.assignee ?? []) sp.append("assignee[]", a);
  for (const p of params.priority ?? []) sp.append("priority[]", p);
  for (const l of params.label ?? []) sp.append("label[]", l);
  for (const m of params.milestone ?? []) sp.append("milestone[]", m);
  if (params.due) sp.set("due", params.due);
  if (params.q && params.q.trim()) sp.set("q", params.q.trim());
  if (params.sort) sp.set("sort", params.sort);
  if (params.dir) sp.set("dir", params.dir);
  if (params.includeSubtasks === false) sp.set("includeSubtasks", "false");
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * GET /projects/:id/tasks — flexible, enriched task list. Pass `params` to
 * group/filter/sort; each distinct param set is cached under its own key.
 */
export function useProjectTasks(
  projectId: string,
  params: ProjectTaskListParams = {},
) {
  return useQuery({
    queryKey: queryKeys.projectTasks(
      projectId,
      params as Record<string, unknown>,
    ),
    queryFn: () =>
      api<ProjectTask[]>(
        `/projects/${projectId}/tasks${buildTaskListQuery(params)}`,
      ),
    enabled: !!projectId,
  });
}

export interface ProjectTaskInput {
  title: string;
  description?: string;
  status?: ProjectTaskStatus;
  /** Milestone to file the task under; null detaches it (Unassigned). */
  milestoneId?: string | null;
  assigneeId?: string | null;
  /**
   * Full assignee set (max 20). AUTHORITATIVE on PATCH — replaces the whole set;
   * `[]` or `null` clears all. On POST, seeds the task's assignees. When set, the
   * server mirrors `assigneeId` to the first id.
   */
  assigneeIds?: string[] | null;
  priority?: ProjectTaskPriority;
  estimateMinutes?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  /** Parent task id to create/move this as a subtask (one level only). */
  parentTaskId?: string | null;
  position?: number;
}

/** All cached task-list variants for a project (any param combination). */
function taskListPrefix(projectId: string) {
  return ["projects", projectId, "tasks"] as const;
}

/** Invalidate the project detail (stat cards) + its task & milestone lists. */
function invalidateTasks(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  // Prefix-invalidate every task-list param variant for this project.
  qc.invalidateQueries({ queryKey: taskListPrefix(projectId) });
  qc.invalidateQueries({ queryKey: queryKeys.projectMilestones(projectId) });
  qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
  qc.invalidateQueries({ queryKey: ["projects"] });
}

export function useCreateProjectTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectTaskInput) =>
      api<ProjectTask>(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateTasks(qc, projectId),
  });
}

/**
 * PATCH /projects/:id/tasks/:taskId — accepts every editable field including
 * the new priority/estimate/dates/parent. Optimistic: the changed fields are
 * written into ALL cached task-list variants immediately, with rollback on
 * error.
 */
export function useUpdateProjectTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      input,
    }: {
      taskId: string;
      input: Partial<ProjectTaskInput>;
      /**
       * Optional id→name map for the ids in `input.assigneeIds`. Used ONLY for
       * the optimistic `assignees` write (the server returns the real set on
       * settle); never sent in the request body.
       */
      assigneeNames?: Record<string, string>;
    }) =>
      api<ProjectTask>(`/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: input,
      }),
    onMutate: async ({ taskId, input, assigneeNames }) => {
      await qc.cancelQueries({ queryKey: taskListPrefix(projectId) });
      // Snapshot the cached task-LIST variants only. The ["projects", id,
      // "tasks"] prefix is shared by single-task detail/subtask/comment/
      // dependency caches (non-array shapes); a task list key is exactly
      // length 4 (filters object at [3]). Guard with isArray too.
      const snapshots = qc.getQueriesData<ProjectTask[]>({
        predicate: (q) => {
          const k = q.queryKey as unknown[];
          return (
            k[0] === "projects" &&
            k[1] === projectId &&
            k[2] === "tasks" &&
            k.length === 4
          );
        },
      });
      const patch = optimisticTaskPatch(input, assigneeNames);
      for (const [key, list] of snapshots) {
        if (!Array.isArray(list)) continue;
        qc.setQueryData<ProjectTask[]>(
          key,
          list.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
        );
      }
      // Also patch the single-task DETAIL cache so the open detail sheet
      // (assignee picker, status, dates…) reflects the change INSTANTLY instead
      // of after the server round-trip + refetch — the main perceived slowness.
      const detailKey = queryKeys.projectTask(projectId, taskId);
      const detailSnap = qc.getQueryData<ProjectTaskDetail>(detailKey);
      if (detailSnap?.task) {
        qc.setQueryData<ProjectTaskDetail>(detailKey, {
          ...detailSnap,
          task: { ...detailSnap.task, ...patch },
        });
      }
      return { snapshots, detailKey, detailSnap };
    },
    onError: (_err, _vars, context) => {
      // Restore each snapshot we touched.
      for (const [key, data] of context?.snapshots ?? []) {
        qc.setQueryData(key, data);
      }
      if (context?.detailKey && context.detailSnap !== undefined) {
        qc.setQueryData(context.detailKey, context.detailSnap);
      }
    },
    onSettled: () => invalidateTasks(qc, projectId),
  });
}

/**
 * Translate a task input patch into the optimistic ProjectTask field delta,
 * deriving completedAt from a status change so the UI matches the server.
 */
function optimisticTaskPatch(
  input: Partial<ProjectTaskInput>,
  assigneeNames?: Record<string, string>,
): Partial<ProjectTask> {
  const patch: Partial<ProjectTask> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completedAt =
      input.status === "done" ? new Date().toISOString() : null;
  }
  if (input.milestoneId !== undefined) patch.milestoneId = input.milestoneId;
  if (input.assigneeId !== undefined) patch.assigneeId = input.assigneeId;
  // `assigneeIds` is AUTHORITATIVE — replace the whole set. Mirror the first id
  // onto the legacy assigneeId/Name so single-assignee surfaces stay in sync.
  if (input.assigneeIds !== undefined) {
    const ids = input.assigneeIds ?? [];
    patch.assignees = ids.map((userId) => ({
      userId,
      name: assigneeNames?.[userId] ?? "",
    }));
    const firstId = ids[0] ?? null;
    patch.assigneeId = firstId;
    patch.assigneeName = firstId ? (assigneeNames?.[firstId] ?? null) : null;
  }
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.estimateMinutes !== undefined)
    patch.estimateMinutes = input.estimateMinutes;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
  if (input.parentTaskId !== undefined)
    patch.parentTaskId = input.parentTaskId;
  if (input.position !== undefined) patch.position = input.position;
  return patch;
}

export function useDeleteProjectTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api<void>(`/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateTasks(qc, projectId),
  });
}

export interface BulkCreateTasksInput {
  /** One task per title; blank lines are filtered out by callers. */
  titles: string[];
  milestoneId?: string | null;
  status?: ProjectTaskStatus;
}

/**
 * POST /projects/:id/tasks/bulk — create many tasks at once (e.g. from a pasted
 * list). All land in the same (milestoneId, status) cell.
 */
export function useBulkCreateProjectTasks(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkCreateTasksInput) =>
      api<ProjectTask[]>(`/projects/${projectId}/tasks/bulk`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateTasks(qc, projectId),
  });
}
