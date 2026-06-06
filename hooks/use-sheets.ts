"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Sheet, SheetData, SheetSummary } from "@/lib/api/types";

/** GET /sheets — list every sheet in the agency. */
export function useSheets() {
  return useQuery({
    queryKey: queryKeys.sheets(),
    queryFn: () => api<SheetSummary[]>("/sheets"),
  });
}

/** GET /sheets/:id — the full sheet incl. its grid. */
export function useSheet(sheetId: string) {
  return useQuery({
    queryKey: queryKeys.sheet(sheetId),
    queryFn: () => api<Sheet>(`/sheets/${sheetId}`),
    enabled: !!sheetId,
  });
}

/** Body for POST /sheets. */
export interface CreateSheetInput {
  title?: string;
  clientId?: string | null;
  projectId?: string | null;
}

export function useCreateSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSheetInput = {}) =>
      api<Sheet>("/sheets", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sheets"] }),
  });
}

/** Body for PATCH /sheets/:id (title/data/links — all optional). */
export interface UpdateSheetInput {
  title?: string;
  data?: SheetData;
  clientId?: string | null;
  projectId?: string | null;
}

/**
 * PATCH /sheets/:id — used for the debounced autosave (data) and inline title
 * rename. Does NOT invalidate the list on every keystroke-driven save to avoid
 * refetch thrash; pass `silent: false` (the default for explicit edits) to
 * refresh the list when title/links change.
 */
export function useUpdateSheet(sheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSheetInput) =>
      api<Sheet>(`/sheets/${sheetId}`, { method: "PATCH", body: input }),
    onSuccess: (updated) => {
      // Keep the detail cache warm without forcing a refetch of the editor.
      qc.setQueryData(queryKeys.sheet(sheetId), updated);
      qc.invalidateQueries({ queryKey: ["sheets"] });
    },
  });
}

export function useDuplicateSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sheetId: string) =>
      api<Sheet>(`/sheets/${sheetId}/duplicate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sheets"] }),
  });
}

export function useDeleteSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sheetId: string) =>
      api<void>(`/sheets/${sheetId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sheets"] }),
  });
}
