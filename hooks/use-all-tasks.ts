"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProjectTask } from "@/lib/api/types";

export interface CrossProjectTask extends ProjectTask {
  projectName?: string | null;
  clientName?: string | null;
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
}

export function useAllTasks(filters?: {
  projectId?: string;
  clientId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.allTasks(filters),
    queryFn: () => api<CrossProjectTask[]>("/projects/all-tasks", { query: filters }),
  });
}

export function useMyTasks(filters?: { status?: string; includeDone?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.myTasks, filters],
    queryFn: () =>
      api<CrossProjectTask[]>("/me/tasks", {
        query: {
          status: filters?.status,
          includeDone: filters?.includeDone ? "true" : undefined,
        },
      }),
  });
}

export function useUpdateCrossProjectTask() {
  return {
    mutateAsync: async ({
      projectId,
      taskId,
      status,
    }: {
      projectId: string;
      taskId: string;
      status: string;
    }) => {
      return api(`/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: { status },
      });
    },
  };
}
