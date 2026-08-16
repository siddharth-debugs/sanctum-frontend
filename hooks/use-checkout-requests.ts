"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

/**
 * An out-of-office checkout held for approval. Raised automatically when a
 * member checks out from outside the office geofence; an owner/admin (or an
 * attendance manager) approves it to finalize the day's checkout.
 */
export interface CheckoutRequest {
  id: string;
  userId: string;
  userName: string | null;
  day: string;
  requestedCheckOutAt: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutLocation: string | null;
  distanceM: number | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string | null;
}

// Nested under the shared "attendance" root so invalidating attendance also
// refreshes the approver queue.
const checkoutRequestsKey = (scope: "me" | "all" | "pending") =>
  ["attendance", "checkout-requests", scope] as const;

/** GET /attendance/checkout-requests?scope=pending — the approver queue. */
export function usePendingCheckoutRequests(enabled = true) {
  return useQuery<CheckoutRequest[]>({
    queryKey: checkoutRequestsKey("pending"),
    queryFn: () =>
      api<CheckoutRequest[]>("/attendance/checkout-requests", {
        query: { scope: "pending" },
      }),
    enabled,
  });
}

/** GET /attendance/checkout-requests — the caller's own requests. */
export function useMyCheckoutRequests() {
  return useQuery<CheckoutRequest[]>({
    queryKey: checkoutRequestsKey("me"),
    queryFn: () =>
      api<CheckoutRequest[]>("/attendance/checkout-requests", {
        query: { scope: "me" },
      }),
  });
}

/** POST /attendance/checkout-requests/:id/decide — approve or reject. */
export function useDecideCheckoutRequest() {
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
      api<CheckoutRequest>(`/attendance/checkout-requests/${id}/decide`, {
        method: "POST",
        body: { decision, note },
      }),
    // Refreshes the queue AND the finalized attendance record/calendar.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** POST /attendance/checkout-requests/:id/cancel — withdraw a pending request. */
export function useCancelCheckoutRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/attendance/checkout-requests/${id}/cancel`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}
