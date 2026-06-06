"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  TeamMember,
  TeamMemberDetail,
  TimeLog,
  Role,
} from "@/lib/api/types";

export interface TeamFilters extends Record<string, string | boolean | undefined> {
  role?: string;
  search?: string;
  activeOnly?: boolean;
}

/** GET /team — members in the agency (returns a plain ARRAY). */
export function useTeam(filters?: TeamFilters) {
  return useQuery({
    queryKey: queryKeys.team(filters),
    queryFn: () =>
      api<TeamMember[]>("/team", {
        query: {
          role: filters?.role,
          search: filters?.search,
          activeOnly: filters?.activeOnly ? "true" : undefined,
        },
      }),
  });
}

/** GET /team/:id — a member plus folded projects / tasks / time logs. */
export function useTeamMember(memberId: string) {
  return useQuery({
    queryKey: queryKeys.teamMember(memberId),
    queryFn: () => api<TeamMemberDetail>(`/team/${memberId}`),
    enabled: !!memberId,
  });
}

/** GET /team/:id/time-logs — a member's time-log entries. */
export function useMemberTimeLogs(memberId: string) {
  return useQuery({
    queryKey: queryKeys.teamMemberTimeLogs(memberId),
    queryFn: () => api<TimeLog[]>(`/team/${memberId}/time-logs`),
    enabled: !!memberId,
  });
}

/** POST /team/invite body. */
export interface InviteMemberInput {
  fullName: string;
  email: string;
  role?: Role;
  phone?: string;
  designation?: string;
  department?: string;
  /** Hourly rate in integer PAISE. */
  hourlyRate?: number;
  weeklyCapacityHrs?: number;
  skills?: string[];
}

export interface InviteMemberResult {
  member: TeamMember;
  inviteUrl?: string;
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) =>
      api<InviteMemberResult>("/team/invite", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

/** PATCH /team/:id body — profile / role / status updates. */
export interface UpdateMemberInput {
  fullName?: string;
  role?: Role;
  status?: TeamMember["status"];
  designation?: string;
  department?: string;
  phone?: string;
  /** Hourly rate in integer PAISE. */
  hourlyRate?: number;
  weeklyCapacityHrs?: number;
  /** Either a string[] or a comma-separated CSV — backend accepts both. */
  skills?: string[] | string;
}

export function useUpdateMember(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMemberInput) =>
      api<TeamMember>(`/team/${memberId}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: queryKeys.teamMember(memberId) });
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api<void>(`/team/${memberId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

/** POST /team/:id/time-logs body. */
export interface LogTimeInput {
  minutes: number;
  projectId?: string;
  taskId?: string;
  workDate?: string;
  note?: string;
}

export function useLogTime(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogTimeInput) =>
      api<TimeLog>(`/team/${memberId}/time-logs`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: queryKeys.teamMember(memberId) });
      qc.invalidateQueries({ queryKey: queryKeys.teamMemberTimeLogs(memberId) });
    },
  });
}
