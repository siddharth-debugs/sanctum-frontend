"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProjectLabel, ProjectLabelColor } from "@/lib/api/types";

/** GET /projects/:id/labels — project-scoped label definitions. */
export function useProjectLabels(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectLabels(projectId),
    queryFn: () => api<ProjectLabel[]>(`/projects/${projectId}/labels`),
    enabled: !!projectId,
  });
}

export interface ProjectLabelInput {
  name: string;
  color?: ProjectLabelColor;
}

function invalidateLabels(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  qc.invalidateQueries({ queryKey: queryKeys.projectLabels(projectId) });
  // Labels appear enriched on tasks — refresh every task-list variant.
  qc.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
}

/** POST /projects/:id/labels */
export function useCreateProjectLabel(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectLabelInput) =>
      api<ProjectLabel>(`/projects/${projectId}/labels`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateLabels(qc, projectId),
  });
}

/** PATCH /projects/:id/labels/:labelId */
export function useUpdateProjectLabel(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      labelId,
      input,
    }: {
      labelId: string;
      input: Partial<ProjectLabelInput>;
    }) =>
      api<ProjectLabel>(`/projects/${projectId}/labels/${labelId}`, {
        method: "PATCH",
        body: input,
      }),
    onMutate: async ({ labelId, input }) => {
      await qc.cancelQueries({ queryKey: queryKeys.projectLabels(projectId) });
      const prev = qc.getQueryData<ProjectLabel[]>(
        queryKeys.projectLabels(projectId),
      );
      if (prev) {
        qc.setQueryData<ProjectLabel[]>(
          queryKeys.projectLabels(projectId),
          prev.map((l) => (l.id === labelId ? { ...l, ...input } : l)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.projectLabels(projectId), context.prev);
      }
    },
    onSettled: () => invalidateLabels(qc, projectId),
  });
}

/** DELETE /projects/:id/labels/:labelId (cascades links) */
export function useDeleteProjectLabel(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId: string) =>
      api<void>(`/projects/${projectId}/labels/${labelId}`, {
        method: "DELETE",
      }),
    onMutate: async (labelId) => {
      await qc.cancelQueries({ queryKey: queryKeys.projectLabels(projectId) });
      const prev = qc.getQueryData<ProjectLabel[]>(
        queryKeys.projectLabels(projectId),
      );
      if (prev) {
        qc.setQueryData<ProjectLabel[]>(
          queryKeys.projectLabels(projectId),
          prev.filter((l) => l.id !== labelId),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.projectLabels(projectId), context.prev);
      }
    },
    onSettled: () => invalidateLabels(qc, projectId),
  });
}

/**
 * PUT /projects/:id/tasks/:taskId/labels — replace a task's full label set.
 * Returns the resolved label list. Optimistically patches the task's `labels`
 * across every cached list variant.
 */
export function useSetTaskLabels(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelIds }: { taskId: string; labelIds: string[] }) =>
      api<ProjectLabel[]>(`/projects/${projectId}/tasks/${taskId}/labels`, {
        method: "PUT",
        body: { labelIds },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
    },
  });
}
