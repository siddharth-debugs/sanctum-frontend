"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  ProjectMilestone,
  ProjectMilestoneStatus,
} from "@/lib/api/types";

/** GET /projects/:id/milestones */
export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectMilestones(projectId),
    queryFn: () =>
      api<ProjectMilestone[]>(`/projects/${projectId}/milestones`),
    enabled: !!projectId,
  });
}

export interface ProjectMilestoneInput {
  title: string;
  description?: string;
  status?: ProjectMilestoneStatus;
  dueDate?: string | null;
}

function invalidateMilestones(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  qc.invalidateQueries({ queryKey: queryKeys.projectMilestones(projectId) });
  qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
  qc.invalidateQueries({ queryKey: ["projects"] });
}

export function useCreateProjectMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectMilestoneInput) =>
      api<ProjectMilestone>(`/projects/${projectId}/milestones`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateMilestones(qc, projectId),
  });
}

export function useUpdateProjectMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      milestoneId,
      input,
    }: {
      milestoneId: string;
      input: Partial<ProjectMilestoneInput>;
    }) =>
      api<ProjectMilestone>(
        `/projects/${projectId}/milestones/${milestoneId}`,
        { method: "PATCH", body: input },
      ),
    onSuccess: () => invalidateMilestones(qc, projectId),
  });
}

export function useDeleteProjectMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) =>
      api<void>(`/projects/${projectId}/milestones/${milestoneId}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateMilestones(qc, projectId),
  });
}
