"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProjectTask, ProjectTaskStatus } from "@/lib/api/types";

/** GET /projects/:id/tasks */
export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectTasks(projectId),
    queryFn: () => api<ProjectTask[]>(`/projects/${projectId}/tasks`),
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
  dueDate?: string | null;
}

/** Invalidate the project detail (stat cards) + its task & milestone lists. */
function invalidateTasks(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  qc.invalidateQueries({ queryKey: queryKeys.projectTasks(projectId) });
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

export function useUpdateProjectTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      input,
    }: {
      taskId: string;
      input: Partial<ProjectTaskInput>;
    }) =>
      api<ProjectTask>(`/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateTasks(qc, projectId),
  });
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
