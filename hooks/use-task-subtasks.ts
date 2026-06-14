"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProjectTask } from "@/lib/api/types";
import type { ProjectTaskInput } from "@/hooks/use-project-tasks";

/**
 * GET /projects/:id/tasks/:taskId/subtasks — children of a task ordered by
 * position, each enriched like a list row.
 */
export function useTaskSubtasks(
  projectId: string,
  taskId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.projectTaskSubtasks(projectId, taskId ?? ""),
    queryFn: () =>
      api<ProjectTask[]>(`/projects/${projectId}/tasks/${taskId}/subtasks`),
    enabled: !!projectId && !!taskId,
  });
}

/** Refresh a parent's subtask list + its detail bundle + the enriched lists. */
function invalidateSubtasks(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
  parentTaskId: string,
) {
  qc.invalidateQueries({
    queryKey: queryKeys.projectTaskSubtasks(projectId, parentTaskId),
  });
  qc.invalidateQueries({
    queryKey: queryKeys.projectTask(projectId, parentTaskId),
  });
  qc.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
  qc.invalidateQueries({ queryKey: queryKeys.projectMilestones(projectId) });
  qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
}

/**
 * Create a subtask under `parentTaskId` (a normal task POST with the parent set;
 * the subtask inherits the parent's milestone unless one is supplied).
 */
export function useCreateSubtask(projectId: string, parentTaskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ProjectTaskInput, "parentTaskId">) =>
      api<ProjectTask>(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: { ...input, parentTaskId },
      }),
    onSuccess: () => invalidateSubtasks(qc, projectId, parentTaskId),
  });
}
