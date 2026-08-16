"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api/client";
import {
  clientPortalApi,
  type ClientPortalFile,
  type ClientPortalFolder,
  type CreateClientFolderInput,
} from "@/lib/api/client-portal";
import { detectUrlFormat } from "./use-documents";
import type { ClientPost, ClientPostComment } from "@/lib/api/types";

/**
 * TanStack Query hooks for the logged-in CLIENT PORTAL (`/client/**`).
 *
 * These are a separate, self-contained key namespace ("client-portal") so they
 * never collide with the agency-side `queryKeys` factory and so a logout's
 * `queryClient.clear()` wipes them too. All reads are Bearer-authed through the
 * shared api() helper.
 */
const clientKeys = {
  me: ["client-portal", "me"] as const,
  projects: ["client-portal", "projects"] as const,
  project: (id: string) => ["client-portal", "projects", id] as const,
  projectTeam: (id: string) =>
    ["client-portal", "projects", id, "team"] as const,
  files: ["client-portal", "files"] as const,
  folders: ["client-portal", "folders"] as const,
  calendar: ["client-portal", "calendar"] as const,
  postComments: (postId: string) =>
    ["client-portal", "posts", postId, "comments"] as const,
  proposals: ["client-portal", "proposals"] as const,
  proposal: (id: string) => ["client-portal", "proposals", id] as const,
  agreements: ["client-portal", "agreements"] as const,
  agreement: (id: string) => ["client-portal", "agreements", id] as const,
  invoices: ["client-portal", "invoices"] as const,
  invoice: (id: string) => ["client-portal", "invoices", id] as const,
};

export { clientKeys };

/** True when the error is a 404 (project out of scope / not found). */
export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

/** GET /client/me — brand + agency chrome for the portal shell. */
export function useClientMe() {
  return useQuery({
    queryKey: clientKeys.me,
    queryFn: clientPortalApi.me,
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /client/projects — the client's projects. */
export function useClientProjects() {
  return useQuery({
    queryKey: clientKeys.projects,
    queryFn: clientPortalApi.projects,
  });
}

/** GET /client/projects/:id — one project's detail. Won't retry a 404. */
export function useClientProject(id: string) {
  return useQuery({
    queryKey: clientKeys.project(id),
    queryFn: () => clientPortalApi.project(id),
    enabled: Boolean(id),
    retry: (failureCount, err) => !isNotFound(err) && failureCount < 1,
  });
}

/** GET /client/projects/:id/team — assigned members (name + role only). */
export function useClientProjectTeam(id: string) {
  return useQuery({
    queryKey: clientKeys.projectTeam(id),
    queryFn: () => clientPortalApi.projectTeam(id),
    enabled: Boolean(id),
    retry: (failureCount, err) => !isNotFound(err) && failureCount < 1,
  });
}

/** GET /client/files — files/links shared with the client. */
export function useClientFiles() {
  return useQuery({
    queryKey: clientKeys.files,
    queryFn: clientPortalApi.files,
  });
}

/** GET /client/folders — every folder the client may see (levels derived here). */
export function useClientFolders() {
  return useQuery({
    queryKey: clientKeys.folders,
    queryFn: () => clientPortalApi.folders(),
  });
}

// ─── Client WRITE: upload files / attach links / create folders ──────────────

interface CloudinaryResult {
  secure_url: string;
  public_id: string;
  resource_type: "image" | "raw" | "video";
  format: string | null;
  bytes: number;
}

/** POST the multipart form straight to Cloudinary, streaming progress via XHR. */
function xhrUpload(
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void,
): Promise<CloudinaryResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CloudinaryResult);
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

export interface ClientUploadInput {
  file: File;
  name: string;
  folderId?: string | null;
  projectId?: string;
  onProgress?: (pct: number) => void;
}

/** Upload a file to the client's shared space (sign → Cloudinary → persist). */
export function useClientUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientUploadInput): Promise<ClientPortalFile> => {
      const sig = await clientPortalApi.signUpload();
      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;
      const form = new FormData();
      form.append("file", input.file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);
      const up = await xhrUpload(uploadUrl, form, input.onProgress);
      return clientPortalApi.createDocument({
        name: input.name,
        projectId: input.projectId,
        folderId: input.folderId ?? undefined,
        fileUrl: up.secure_url,
        publicId: up.public_id,
        resourceType: up.resource_type,
        format: up.format ?? null,
        mimeType: input.file.type || null,
        sizeBytes: up.bytes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.files });
      qc.invalidateQueries({ queryKey: clientKeys.folders });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Upload failed."),
  });
}

export interface ClientLinkInput {
  name: string;
  url: string;
  folderId?: string | null;
  projectId?: string;
}

/** Attach an external cloud link (Drive/OneDrive/…) to the client's space. */
export function useClientCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientLinkInput): Promise<ClientPortalFile> => {
      const format = detectUrlFormat(input.url);
      const mimeType =
        format === "gdrive"
          ? "application/vnd.google-apps"
          : format === "onedrive"
            ? "application/vnd.ms-onedrive"
            : "text/html";
      return clientPortalApi.createDocument({
        name: input.name,
        projectId: input.projectId,
        folderId: input.folderId ?? undefined,
        fileUrl: input.url,
        resourceType: "raw",
        format,
        mimeType,
        sizeBytes: 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.files });
      qc.invalidateQueries({ queryKey: clientKeys.folders });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't save link."),
  });
}

/** Create a folder in the client's shared space. */
export function useClientCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientFolderInput): Promise<ClientPortalFolder> =>
      clientPortalApi.createFolder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.folders });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't create folder."),
  });
}

/** Response shape for GET /client/calendar. */
interface ClientCalendarResponse {
  canApprove: boolean;
  posts: ClientPost[];
}

/** GET /client/calendar — the client's content calendar (drafts excluded). */
export function useClientCalendar() {
  return useQuery({
    queryKey: clientKeys.calendar,
    queryFn: () => api<ClientCalendarResponse>("/client/calendar"),
  });
}

/** GET /client/posts/:postId/comments — the thread on one post. Won't retry a 404. */
export function useClientPostComments(postId: string) {
  return useQuery({
    queryKey: clientKeys.postComments(postId),
    queryFn: () =>
      api<ClientPostComment[]>(`/client/posts/${postId}/comments`),
    enabled: Boolean(postId),
    retry: (failureCount, err) => !isNotFound(err) && failureCount < 1,
  });
}

/**
 * POST /client/posts/:postId/comments — add a comment. The client's name is
 * attached server-side (no name field), so the body is just the text.
 */
export function useAddPostComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api<ClientPostComment>(`/client/posts/${postId}/comments`, {
        method: "POST",
        body: { body },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.postComments(postId) });
      qc.invalidateQueries({ queryKey: clientKeys.calendar });
    },
  });
}

/** Body for POST /client/posts/:postId/decision. */
interface DecisionInput {
  decision: "approved" | "changes_requested";
  note?: string;
}

/** Response for POST /client/posts/:postId/decision. */
interface DecisionResult {
  postId: string;
  decision: string;
  newStatus: string;
}

/**
 * POST /client/posts/:postId/decision — approve or request changes. Approve is
 * server-gated to `canApprove` clients (403 otherwise); hide it in the UI too.
 */
export function useDecidePost(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DecisionInput) =>
      api<DecisionResult>(`/client/posts/${postId}/decision`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.calendar });
      qc.invalidateQueries({ queryKey: clientKeys.postComments(postId) });
    },
  });
}

// ─── Client Portal Proposals ────────────────────────────────────────────────
export function useClientPortalProposals() {
  return useQuery({
    queryKey: clientKeys.proposals,
    queryFn: () => api<any[]>("/client/proposals"),
  });
}

export function useClientPortalProposal(id: string) {
  return useQuery({
    queryKey: clientKeys.proposal(id),
    queryFn: () => api<any>(`/client/proposals/${id}`),
    enabled: Boolean(id),
  });
}

export function useClientAcceptProposal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ accepted: boolean }>(`/client/proposals/${id}/accept`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.proposals });
      qc.invalidateQueries({ queryKey: clientKeys.proposal(id) });
      toast.success("Proposal accepted successfully!");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't accept proposal."),
  });
}

// ─── Client Portal Agreements ───────────────────────────────────────────────
export function useClientPortalAgreements() {
  return useQuery({
    queryKey: clientKeys.agreements,
    queryFn: () => api<any[]>("/client/agreements"),
  });
}

export function useClientPortalAgreement(id: string) {
  return useQuery({
    queryKey: clientKeys.agreement(id),
    queryFn: () => api<any>(`/client/agreements/${id}`),
    enabled: Boolean(id),
  });
}

export function useClientSignAgreement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { signerName: string; signerEmail: string; signatureDataUrl: string }) =>
      api<{ signed: boolean }>(`/client/agreements/${id}/sign`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.agreements });
      qc.invalidateQueries({ queryKey: clientKeys.agreement(id) });
      toast.success("Agreement signed successfully!");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't sign agreement."),
  });
}

// ─── Client Portal Invoices ─────────────────────────────────────────────────
export function useClientPortalInvoices() {
  return useQuery({
    queryKey: clientKeys.invoices,
    queryFn: () => api<any[]>("/client/invoices"),
  });
}

export function useClientPortalInvoice(id: string) {
  return useQuery({
    queryKey: clientKeys.invoice(id),
    queryFn: () => api<any>(`/client/invoices/${id}`),
    enabled: Boolean(id),
  });
}
