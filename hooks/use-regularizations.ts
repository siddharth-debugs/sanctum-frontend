"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { RegularizationRequest, RegularizationType } from "@/lib/api/types";

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ["attendance"] });

export function useRegularizations(
  scope: "me" | "all" | "pending" = "me",
  userId?: string,
) {
  return useQuery<RegularizationRequest[]>({
    queryKey: queryKeys.regularizations(scope, userId),
    queryFn: () =>
      api<RegularizationRequest[]>("/attendance/regularizations", {
        query: { scope, userId },
      }),
  });
}

export interface RaiseRegularizationInput {
  day: string;
  type: RegularizationType;
  requestedCheckInAt?: string;
  requestedCheckOutAt?: string;
  requestedStatus?: "present" | "half_day" | "on_leave";
  reason: string;
}

export function useRaiseRegularization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RaiseRegularizationInput) =>
      api<RegularizationRequest>("/attendance/regularizations", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDecideRegularization() {
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
      api<RegularizationRequest>(`/attendance/regularizations/${id}/decide`, {
        method: "POST",
        body: { decision, note },
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCancelRegularization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/attendance/regularizations/${id}/cancel`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}
