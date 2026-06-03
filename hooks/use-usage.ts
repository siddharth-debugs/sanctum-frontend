"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { AgencyUsage } from "@/lib/api/types";

/**
 * GET /agency/usage — current-period AI/storage/clients/team usage vs plan,
 * plus the AI provider/model and HTTP rate-limit windows. Owner/admin only.
 *
 * A 403 (member caller) is treated as a *successful* "forbidden" outcome
 * rather than thrown, so the UI can show a friendly note without tripping an
 * error boundary. Any other failure rejects as normal.
 */
export interface UsageModel {
  usage: AgencyUsage | null;
  /** True when the caller isn't an owner/admin (403). */
  forbidden: boolean;
}

export function useUsage() {
  return useQuery<UsageModel>({
    queryKey: queryKeys.usage,
    queryFn: async () => {
      try {
        const usage = await api<AgencyUsage>("/agency/usage");
        return { usage, forbidden: false };
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          return { usage: null, forbidden: true };
        }
        throw err;
      }
    },
    // 403 is a stable outcome for a member — don't hammer the endpoint.
    retry: (failureCount, err) =>
      !(err instanceof ApiError && err.status === 403) && failureCount < 2,
  });
}
