"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProjectTaskDetail } from "@/lib/api/types";

/**
 * GET /projects/:id/tasks/:taskId — the full detail bundle (task, subtasks,
 * labels, dependencies, comments, activity, and a merged chronological feed).
 * Drives the task detail slide-over. Disabled until both ids are present so the
 * sheet can mount before a task is selected.
 */
export function useTaskDetail(
  projectId: string,
  taskId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.projectTask(projectId, taskId ?? ""),
    queryFn: () =>
      api<ProjectTaskDetail>(`/projects/${projectId}/tasks/${taskId}`),
    enabled: !!projectId && !!taskId,
  });
}
