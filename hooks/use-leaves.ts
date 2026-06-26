"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  LeaveBalances,
  LeaveRequest,
  LeaveType,
} from "@/lib/api/types";

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ["attendance"] });

// ---- Leave types ----
export function useLeaveTypes() {
  return useQuery<LeaveType[]>({
    queryKey: queryKeys.leaveTypes,
    queryFn: () => api<LeaveType[]>("/attendance/leaves/types"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface LeaveTypeInput {
  name: string;
  colorToken?: string;
  paid?: boolean;
  annualQuota?: number;
  active?: boolean;
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeaveTypeInput) =>
      api<LeaveType>("/attendance/leaves/types", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leaveTypes }),
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: LeaveTypeInput & { id: string }) =>
      api<LeaveType>(`/attendance/leaves/types/${id}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leaveTypes }),
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/attendance/leaves/types/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leaveTypes }),
  });
}

// ---- Leave requests ----
export function useLeaves(scope: "me" | "all" | "pending" = "me", userId?: string) {
  return useQuery<LeaveRequest[]>({
    queryKey: queryKeys.leaves(scope, userId),
    queryFn: () =>
      api<LeaveRequest[]>("/attendance/leaves", { query: { scope, userId } }),
  });
}

export function useLeaveBalances(userId: string, year: number) {
  return useQuery<LeaveBalances>({
    queryKey: queryKeys.leaveBalances(userId || "me", year),
    queryFn: () =>
      api<LeaveBalances>("/attendance/leaves/balances", {
        query: { userId: userId || undefined, year },
      }),
  });
}

export interface ApplyLeaveInput {
  leaveTypeId: string;
  startDay: string;
  endDay: string;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  reason?: string;
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyLeaveInput) =>
      api<LeaveRequest>("/attendance/leaves", { method: "POST", body: input }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "approved" | "rejected";
      note?: string;
    }) =>
      api<LeaveRequest>(`/attendance/leaves/${id}/decide`, {
        method: "POST",
        body: { decision, note },
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/attendance/leaves/${id}/cancel`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}
