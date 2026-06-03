"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { MeResponse } from "@/lib/api/types";

/**
 * GET /auth/me — the current session. A 401 means "not authenticated"; we keep
 * it as an error (no retry) so callers can redirect to /login. Any other error
 * is surfaced too.
 */
export function useMe(enabled = true) {
  return useQuery<MeResponse>({
    queryKey: queryKeys.me,
    queryFn: () => api<MeResponse>("/auth/me"),
    enabled,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function isUnauthenticated(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
