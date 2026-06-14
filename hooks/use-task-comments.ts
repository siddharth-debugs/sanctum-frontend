"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProjectTaskComment } from "@/lib/api/types";

/** GET /projects/:id/tasks/:taskId/comments (non-deleted, oldest-first). */
export function useTaskComments(
  projectId: string,
  taskId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.projectTaskComments(projectId, taskId ?? ""),
    queryFn: () =>
      api<ProjectTaskComment[]>(
        `/projects/${projectId}/tasks/${taskId}/comments`,
      ),
    enabled: !!projectId && !!taskId,
  });
}

export interface TaskCommentInput {
  body: string;
  /** Explicit mention userIds (the server also parses @tokens from `body`). */
  mentions?: string[];
}

/** Refresh the comment list, the task detail bundle, and comment counts. */
function invalidateComments(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
  taskId: string,
) {
  qc.invalidateQueries({
    queryKey: queryKeys.projectTaskComments(projectId, taskId),
  });
  qc.invalidateQueries({ queryKey: queryKeys.projectTask(projectId, taskId) });
  qc.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
}

/**
 * POST .../comments — optimistically appends a pending comment (with a temp id)
 * to the cached list, then reconciles on success / rolls back on error.
 */
export function useCreateTaskComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskCommentInput) =>
      api<ProjectTaskComment>(
        `/projects/${projectId}/tasks/${taskId}/comments`,
        { method: "POST", body: input },
      ),
    onMutate: async (input) => {
      const key = queryKeys.projectTaskComments(projectId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ProjectTaskComment[]>(key);
      const now = new Date().toISOString();
      const optimistic: ProjectTaskComment = {
        id: `tmp_${now}`,
        taskId,
        authorId: "",
        authorName: null,
        body: input.body,
        mentions: input.mentions ?? [],
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      qc.setQueryData<ProjectTaskComment[]>(key, [
        ...(prev ?? []),
        optimistic,
      ]);
      return { prev, optimisticId: optimistic.id };
    },
    onSuccess: (created, _input, context) => {
      const key = queryKeys.projectTaskComments(projectId, taskId);
      // Swap the temp comment for the server's row.
      qc.setQueryData<ProjectTaskComment[]>(key, (list) =>
        (list ?? []).map((c) =>
          c.id === context?.optimisticId ? created : c,
        ),
      );
    },
    onError: (_err, _input, context) => {
      if (context?.prev) {
        qc.setQueryData(
          queryKeys.projectTaskComments(projectId, taskId),
          context.prev,
        );
      }
    },
    onSettled: () => invalidateComments(qc, projectId, taskId),
  });
}

/** PATCH .../comments/:commentId (author-only). */
export function useUpdateTaskComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      input,
    }: {
      commentId: string;
      input: TaskCommentInput;
    }) =>
      api<ProjectTaskComment>(
        `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        { method: "PATCH", body: input },
      ),
    onMutate: async ({ commentId, input }) => {
      const key = queryKeys.projectTaskComments(projectId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ProjectTaskComment[]>(key);
      if (prev) {
        qc.setQueryData<ProjectTaskComment[]>(
          key,
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  body: input.body,
                  mentions: input.mentions ?? c.mentions,
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(
          queryKeys.projectTaskComments(projectId, taskId),
          context.prev,
        );
      }
    },
    onSettled: () => invalidateComments(qc, projectId, taskId),
  });
}

/** DELETE .../comments/:commentId (author-only soft delete). */
export function useDeleteTaskComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      api<void>(
        `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        { method: "DELETE" },
      ),
    onMutate: async (commentId) => {
      const key = queryKeys.projectTaskComments(projectId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ProjectTaskComment[]>(key);
      if (prev) {
        qc.setQueryData<ProjectTaskComment[]>(
          key,
          prev.filter((c) => c.id !== commentId),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(
          queryKeys.projectTaskComments(projectId, taskId),
          context.prev,
        );
      }
    },
    onSettled: () => invalidateComments(qc, projectId, taskId),
  });
}
