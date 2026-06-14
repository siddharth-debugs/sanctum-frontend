"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProjectTaskDependencies } from "@/lib/api/types";

/** GET /projects/:id/tasks/:taskId/dependencies → { blockedBy, blocks }. */
export function useTaskDependencies(
  projectId: string,
  taskId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.projectTaskDependencies(projectId, taskId ?? ""),
    queryFn: () =>
      api<ProjectTaskDependencies>(
        `/projects/${projectId}/tasks/${taskId}/dependencies`,
      ),
    enabled: !!projectId && !!taskId,
  });
}

export interface TaskDependencyInput {
  /** "blocks": this task blocks `otherTaskId`; "blocked_by": the reverse. */
  type: "blocks" | "blocked_by";
  otherTaskId: string;
}

/** Refresh this task's dependencies + detail bundle + the enriched list. */
function invalidateDependencies(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
  taskId: string,
) {
  qc.invalidateQueries({
    queryKey: queryKeys.projectTaskDependencies(projectId, taskId),
  });
  qc.invalidateQueries({ queryKey: queryKeys.projectTask(projectId, taskId) });
  // blockedByCount is enriched onto every task list.
  qc.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
}

/**
 * POST .../dependencies — add a blocks / blocked-by edge. Returns the refreshed
 * dependency lists for the task. Self/dup/cycle rejection is enforced server-side
 * (surfaces as a thrown ApiError the caller can toast).
 */
export function useAddTaskDependency(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskDependencyInput) =>
      api<ProjectTaskDependencies>(
        `/projects/${projectId}/tasks/${taskId}/dependencies`,
        { method: "POST", body: input },
      ),
    onSuccess: (deps) => {
      // The server hands back the fresh lists — seed the cache directly.
      qc.setQueryData(
        queryKeys.projectTaskDependencies(projectId, taskId),
        deps,
      );
      invalidateDependencies(qc, projectId, taskId);
    },
  });
}

/** DELETE .../dependencies/:depId — remove a dependency edge. */
export function useRemoveTaskDependency(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (depId: string) =>
      api<ProjectTaskDependencies>(
        `/projects/${projectId}/tasks/${taskId}/dependencies/${depId}`,
        { method: "DELETE" },
      ),
    onMutate: async (depId) => {
      const key = queryKeys.projectTaskDependencies(projectId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ProjectTaskDependencies>(key);
      if (prev) {
        qc.setQueryData<ProjectTaskDependencies>(key, {
          blockedBy: prev.blockedBy.filter((e) => e.depId !== depId),
          blocks: prev.blocks.filter((e) => e.depId !== depId),
        });
      }
      return { prev };
    },
    onError: (_err, _depId, context) => {
      if (context?.prev) {
        qc.setQueryData(
          queryKeys.projectTaskDependencies(projectId, taskId),
          context.prev,
        );
      }
    },
    onSuccess: (deps) => {
      qc.setQueryData(
        queryKeys.projectTaskDependencies(projectId, taskId),
        deps,
      );
    },
    onSettled: () => invalidateDependencies(qc, projectId, taskId),
  });
}
