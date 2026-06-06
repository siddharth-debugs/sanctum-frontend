"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProjectMember } from "@/lib/api/types";

/** GET /projects/:id/members */
export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: () => api<ProjectMember[]>(`/projects/${projectId}/members`),
    enabled: !!projectId,
  });
}

export interface ProjectMemberInput {
  userId: string;
  role?: string;
}

function invalidateMembers(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  qc.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
  qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
  qc.invalidateQueries({ queryKey: ["projects"] });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectMemberInput) =>
      api<ProjectMember>(`/projects/${projectId}/members`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateMembers(qc, projectId),
  });
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api<void>(`/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateMembers(qc, projectId),
  });
}
