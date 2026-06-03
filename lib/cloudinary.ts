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
