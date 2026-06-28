import { api } from "@/lib/api/client";
import { env } from "@/lib/env";

export interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  resourceType: "image" | "video";
  uploadUrl: string;
}

export interface UploadedAsset {
  publicId: string;
  secureUrl: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
  resourceType: "image" | "video";
}

/** Ask the backend to sign an upload (POST /media/sign), then upload directly. */
export async function uploadToCloudinary(
  file: File,
  opts: { clientId: string; postId?: string },
): Promise<UploadedAsset> {
  const resourceType: "image" | "video" = file.type.startsWith("video")
    ? "video"
    : "image";

  const sig = await api<CloudinarySignature>("/media/sign", {
    method: "POST",
    body: {
      clientId: opts.clientId,
      postId: opts.postId,
      resourceType,
      filename: file.name,
    },
  });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  form.append("public_id", sig.publicId);

  const res = await fetch(sig.uploadUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const json = await res.json();

  return {
    publicId: json.public_id,
    secureUrl: json.secure_url,
    bytes: json.bytes,
    width: json.width,
    height: json.height,
    format: json.format,
    resourceType,
  };
}

export const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// ---------------------------------------------------------------------------
// Message attachments — a generic, agency-scoped upload (no client required).
// Reuses the Documents signing flow: POST /documents/sign returns signed
// Cloudinary params, then the browser uploads straight to Cloudinary's
// /auto/upload endpoint. The returned shape matches MessageAttachment.
// ---------------------------------------------------------------------------

interface DocumentSignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export interface UploadedAttachment {
  url: string;
  type: "image" | "file";
  name: string;
  mime: string | null;
  bytes: number | null;
}

/**
 * Upload a single message attachment to Cloudinary via the signed Documents
 * flow. Images are detected from the file MIME so they can render inline.
 */
export async function uploadMessageAttachment(
  file: File,
): Promise<UploadedAttachment> {
  const sig = await api<DocumentSignResponse>("/documents/sign", {
    method: "POST",
    body: {},
  });

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const json = (await res.json()) as {
    secure_url: string;
    bytes?: number;
    resource_type?: string;
  };

  const isImage =
    file.type.startsWith("image/") || json.resource_type === "image";

  return {
    url: json.secure_url,
    type: isImage ? "image" : "file",
    name: file.name,
    mime: file.type || null,
    bytes: typeof json.bytes === "number" ? json.bytes : null,
  };
}
