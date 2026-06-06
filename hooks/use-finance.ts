"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FinanceOverview } from "@/lib/api/types";

export interface FinanceOverviewFilters
  extends Record<string, string | undefined> {
  from?: string;
  to?: string;
}

/** GET /finance/overview — KPIs, pipeline, and breakdowns for the date range. */
export function useFinanceOverview(filters?: FinanceOverviewFilters) {
  return useQuery({
    queryKey: queryKeys.financeOverview(filters),
    queryFn: () => api<FinanceOverview>("/finance/overview", { query: filters }),
  });
}
