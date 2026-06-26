"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CustomRole,
  PermissionMap,
  RolePermissions,
  UpdateRolePermissionsInput,
} from "@/lib/api/types";

/** GET /agency/roles — module catalog + per-role permission matrix. */
export function useRolePermissions(enabled = true) {
  return useQuery<RolePermissions>({
    queryKey: queryKeys.rolePermissions,
    queryFn: () => api<RolePermissions>("/agency/roles"),
    enabled,
  });
}

/** PUT /agency/roles — save the admin/member role defaults. */
export function useUpdateRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRolePermissionsInput) =>
      api<RolePermissions>("/agency/roles", { method: "PUT", body: input }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.rolePermissions, data);
      // A role-default change can alter the current user's own effective
      // permissions (sidebar/route gating), so refresh the session too.
      qc.invalidateQueries({ queryKey: queryKeys.me });
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

// ---- Custom roles ----
export function useCustomRoles(enabled = true) {
  return useQuery<CustomRole[]>({
    queryKey: queryKeys.customRoles,
    queryFn: () => api<CustomRole[]>("/agency/custom-roles"),
    enabled,
  });
}

export interface CustomRoleInput {
  name: string;
  colorToken?: string;
  baseRole: "admin" | "member";
  permissions?: Partial<PermissionMap>;
}

const invalRoles = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: queryKeys.customRoles });
  qc.invalidateQueries({ queryKey: queryKeys.me });
  qc.invalidateQueries({ queryKey: ["team"] });
};

export function useCreateCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomRoleInput) =>
      api<CustomRole>("/agency/custom-roles", { method: "POST", body: input }),
    onSuccess: () => invalRoles(qc),
  });
}

export function useUpdateCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CustomRoleInput> & { id: string }) =>
      api<CustomRole>(`/agency/custom-roles/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => invalRoles(qc),
  });
}

export function useDeleteCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/agency/custom-roles/${id}`, { method: "DELETE" }),
    onSuccess: () => invalRoles(qc),
  });
}
