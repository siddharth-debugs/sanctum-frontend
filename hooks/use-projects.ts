"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  Project,
  ProjectType,
  ProjectStatus,
  ProjectHealth,
} from "@/lib/api/types";

export interface ProjectFilters extends Record<string, string | undefined> {
  status?: string;
  health?: string;
  clientId?: string;
  search?: string;
}

/** GET /projects — list projects in the agency (optionally filtered). */
export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: queryKeys.projects(filters),
    queryFn: () => api<Project[]>("/projects", { query: filters }),
  });
}

/** GET /projects/:id */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => api<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
}

/** Request body for POST /projects and PATCH /projects/:id. */
export interface ProjectInput {
  name: string;
  description?: string;
  clientId: string;
  type: ProjectType;
  status: ProjectStatus;
  health: ProjectHealth;
  contractValue?: number;
  currency?: string;
  startDate?: string | null;
  deadline?: string | null;
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) =>
      api<Project>("/projects", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProjectInput>) =>
      api<Project>(`/projects/${projectId}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api<void>(`/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
