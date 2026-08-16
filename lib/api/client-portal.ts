import { api } from "@/lib/api/client";
import type {
  ClientFile,
  ClientPortalMe,
  ClientProject,
  ClientProjectDetail,
  ClientTeamMember,
} from "@/lib/api/types";

/**
 * A client-visible file, plus the `folderId` the portal navigates by. Declared
 * inline (the shared `types.ts` is owned elsewhere) — extends the base
 * `ClientFile` returned by GET /client/files.
 */
export interface ClientPortalFile extends ClientFile {
  /** Folder this file lives in, or null when it sits at the root. */
  folderId: string | null;
}

/** A client-VISIBLE folder returned by GET /client/folders. */
export interface ClientPortalFolder {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string | null;
  createdAt: string | null;
}

/** Cloudinary signed-upload params from POST /client/documents/sign. */
export interface ClientSignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/** Body for POST /client/documents (after the file is on Cloudinary, or a link). */
export interface CreateClientDocumentInput {
  name: string;
  projectId?: string;
  folderId?: string | null;
  fileUrl: string;
  publicId?: string;
  resourceType?: "image" | "raw" | "video";
  format?: string | null;
  mimeType?: string | null;
  sizeBytes?: number;
}

/** Body for POST /client/folders. */
export interface CreateClientFolderInput {
  name: string;
  parentId?: string | null;
  projectId?: string;
}

/**
 * Thin read-only wrapper over the logged-in client-portal endpoints. A `client`
 * -role user authenticates with the same Bearer access token as agency staff
 * (see lib/api/client.ts), but only ever touches this `/client/**` surface — it
 * returns a scoped, redacted view of their own projects, team and files.
 */
export const clientPortalApi = {
  /** GET /client/me — the signed-in client, their brand, and the agency chrome. */
  me: () => api<ClientPortalMe>("/client/me"),
  /** GET /client/projects — every project in the client's scope. */
  projects: () => api<ClientProject[]>("/client/projects"),
  /** GET /client/projects/:id — one project (404 when out of scope). */
  project: (id: string) => api<ClientProjectDetail>(`/client/projects/${id}`),
  /** GET /client/projects/:id/team — assigned members (name + role, NO emails). */
  projectTeam: (id: string) =>
    api<ClientTeamMember[]>(`/client/projects/${id}/team`),
  /** GET /client/files — files/links the agency shared with this client. */
  files: () => api<ClientPortalFile[]>("/client/files"),
  /**
   * GET /client/folders — client-VISIBLE folders. Omit `parentId` for every
   * visible folder (the portal derives levels client-side).
   */
  folders: (parentId?: string) =>
    api<ClientPortalFolder[]>("/client/folders", {
      query: { parentId },
    }),

  /** POST /client/documents/sign — Cloudinary signed direct-upload params. */
  signUpload: () =>
    api<ClientSignResponse>("/client/documents/sign", {
      method: "POST",
      body: {},
    }),
  /** POST /client/documents — persist an uploaded file OR an external link. */
  createDocument: (input: CreateClientDocumentInput) =>
    api<ClientPortalFile>("/client/documents", { method: "POST", body: input }),
  /** POST /client/folders — create a folder in the client's shared space. */
  createFolder: (input: CreateClientFolderInput) =>
    api<ClientPortalFolder>("/client/folders", { method: "POST", body: input }),
};
