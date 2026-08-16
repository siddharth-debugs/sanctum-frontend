"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/client";

/**
 * A document folder (organizes documents; nestable). Declared inline here — the
 * shared `lib/api/types.ts` is owned by another surface. Mirrors the backend
 * `serializeFolder` in `routes/documents.ts`.
 */
export interface DocumentFolder {
  id: string;
  name: string;
  /** Parent folder id, or null when the folder lives at the root. */
  parentId: string | null;
  clientId: string | null;
  projectId: string | null;
  clientVisible: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FolderFilters extends Record<string, string | undefined> {
  /**
   * Level to list. Omit for every folder (e.g. a move picker); `"root"` (or
   * `""`) for the top level (parentId IS NULL); any folder id for its children.
   */
  parentId?: string;
  clientId?: string;
  projectId?: string;
}

/** Refresh both the document and folder caches after a folder mutation. */
function useFolderInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["folders"] });
    qc.invalidateQueries({ queryKey: ["documents"] });
  };
}

/** GET /documents/folders — folders at a level (or all, when unfiltered). */
export function useFolders(filters?: FolderFilters) {
  return useQuery({
    queryKey: ["folders", filters ?? {}],
    queryFn: () =>
      api<DocumentFolder[]>("/documents/folders", { query: filters }),
  });
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  clientVisible?: boolean;
}

/** POST /documents/folders — create a folder at a level. */
export function useCreateFolder() {
  const invalidate = useFolderInvalidation();
  return useMutation({
    mutationFn: (input: CreateFolderInput) =>
      api<DocumentFolder>("/documents/folders", {
        method: "POST",
        body: {
          name: input.name,
          parentId: input.parentId ?? undefined,
          clientId: input.clientId ?? undefined,
          projectId: input.projectId ?? undefined,
          clientVisible: input.clientVisible ?? undefined,
        },
      }),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't create the folder.",
      ),
  });
}

/** PATCH /documents/folders/:id — rename a folder. */
export function useRenameFolder() {
  const invalidate = useFolderInvalidation();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api<DocumentFolder>(`/documents/folders/${id}`, {
        method: "PATCH",
        body: { name },
      }),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't rename the folder.",
      ),
  });
}

/** PATCH /documents/folders/:id — move a folder (parentId=null → root). */
export function useMoveFolder() {
  const invalidate = useFolderInvalidation();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      api<DocumentFolder>(`/documents/folders/${id}`, {
        method: "PATCH",
        body: { parentId },
      }),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't move the folder.",
      ),
  });
}

/** DELETE /documents/folders/:id — files/subfolders return to root, not deleted. */
export function useDeleteFolder() {
  const invalidate = useFolderInvalidation();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ deleted: boolean }>(`/documents/folders/${id}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete the folder.",
      ),
  });
}
