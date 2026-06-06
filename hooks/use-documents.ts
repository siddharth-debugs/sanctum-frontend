"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Document, DocumentCategory } from "@/lib/api/types";

export interface DocumentFilters
  extends Record<string, string | undefined> {
  category?: string;
  clientId?: string;
  projectId?: string;
  search?: string;
}

/** GET /documents — list documents in the agency (optionally filtered). */
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: queryKeys.documents(filters),
    queryFn: () => api<Document[]>("/documents", { query: filters }),
  });
}

/** Body for PATCH /documents/:id. */
export interface DocumentPatch {
  name?: string;
  category?: DocumentCategory;
  clientId?: string | null;
  projectId?: string | null;
  clientVisible?: 0 | 1;
}

/** Body for POST /documents (after the file is already on Cloudinary). */
export interface CreateDocumentInput {
  name: string;
  category: DocumentCategory;
  clientId?: string | null;
  projectId?: string | null;
  fileUrl: string;
  publicId: string;
  resourceType: Document["resourceType"];
  format: string | null;
  mimeType: string | null;
  sizeBytes: number;
  clientVisible: 0 | 1;
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DocumentPatch }) =>
      api<Document>(`/documents/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Direct-to-Cloudinary upload flow (3 steps). The file is NEVER sent through
// our own backend — only the signature request and the metadata save are.
// ---------------------------------------------------------------------------

interface SignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: Document["resourceType"];
  format: string | null;
  bytes: number;
}

export interface UploadDocumentInput {
  file: File;
  name: string;
  category: DocumentCategory;
  clientId?: string | null;
  projectId?: string | null;
  clientVisible: 0 | 1;
  /** Optional override for the Cloudinary folder. */
  folder?: string;
  /** 0–100 progress callback (best-effort, via XHR). */
  onProgress?: (pct: number) => void;
}

/** POST the multipart form to Cloudinary, streaming progress through XHR. */
function uploadToCloudinary(
  uploadUrl: string,
  form: FormData,
  onProgress?: (pct: number) => void,
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult);
        } catch {
          reject(new Error("Bad Cloudinary response"));
        }
      } else {
        reject(new Error(`Cloudinary upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

/**
 * useUploadDocument: runs the full 3-step flow as a single mutation —
 *  1) POST /documents/sign → signed params,
 *  2) direct multipart POST to Cloudinary (with progress),
 *  3) POST /documents → persisted metadata row.
 * Emits toasts and invalidates the documents + clients caches on success.
 */
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<Document> => {
      // 1) Ask the backend to sign the upload.
      const sig = await api<SignResponse>("/documents/sign", {
        method: "POST",
        body: input.folder ? { folder: input.folder } : {},
      });

      // 2) Upload the raw bytes straight to Cloudinary (auto resource type).
      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;
      const form = new FormData();
      form.append("file", input.file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);

      const uploaded = await uploadToCloudinary(
        uploadUrl,
        form,
        input.onProgress,
      );

      // 3) Persist the document metadata in our own DB.
      return api<Document>("/documents", {
        method: "POST",
        body: {
          name: input.name,
          category: input.category,
          clientId: input.clientId || undefined,
          projectId: input.projectId || undefined,
          fileUrl: uploaded.secure_url,
          publicId: uploaded.public_id,
          resourceType: uploaded.resource_type,
          format: uploaded.format ?? null,
          mimeType: input.file.type || null,
          sizeBytes: uploaded.bytes,
          clientVisible: input.clientVisible,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Upload failed. Please retry.",
      );
    },
  });
}
