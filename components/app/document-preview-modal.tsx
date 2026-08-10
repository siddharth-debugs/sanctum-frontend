"use client";

import { Download, ExternalLink, HardDrive, Cloud, Link2 } from "lucide-react";

import { ViewModal } from "@/components/app/view-modal";
import { Button } from "@/components/ui/button";
import {
  DocumentCategoryBadge,
  DocumentThumb,
  downloadUrl,
  isImageDoc,
  isPdfDoc,
  isCloudLinkDoc,
  cloudProviderLabel,
} from "@/components/app/document-badges";
import { formatBytes, formatDate } from "@/lib/utils";
import type { Document } from "@/lib/api/types";

export function DocumentPreviewModal({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: Document | null | undefined;
}) {
  if (!doc) return null;

  const image = isImageDoc(doc);
  const pdf = isPdfDoc(doc);
  const cloud = isCloudLinkDoc(doc);
  const provider = cloudProviderLabel(doc);

  return (
    <ViewModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={doc.name}
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <DocumentCategoryBadge category={doc.category} />
          {cloud ? (
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              {provider === "Google Drive" ? (
                <HardDrive className="size-3 text-emerald-500" />
              ) : provider === "OneDrive" ? (
                <Cloud className="size-3 text-sky-500" />
              ) : (
                <Link2 className="size-3" />
              )}
              {provider}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {formatBytes(doc.sizeBytes)}
            </span>
          )}
          <span className="opacity-40">•</span>
          <span className="text-muted-foreground">
            Added {formatDate(doc.createdAt)}
          </span>
          {doc.uploadedByName && (
            <>
              <span className="opacity-40">•</span>
              <span className="text-muted-foreground">
                by {doc.uploadedByName}
              </span>
            </>
          )}
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Open in {cloud ? provider : "New Tab"}
            </a>
          </Button>
        </>
      }
    >
      <div className="px-1 py-1">
        {cloud ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] py-12 text-center">
            <DocumentThumb doc={doc} size={72} />
            <div className="space-y-1 max-w-md px-4">
              <p className="font-display text-base font-semibold">{doc.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {doc.fileUrl}
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                Stored externally in {provider} · Consumes 0 B Sanctum media storage
              </p>
            </div>
            <Button asChild size="lg" className="mt-2">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" /> Open in {provider}
              </a>
            </Button>
          </div>
        ) : image ? (
          <div className="overflow-hidden rounded-xl border bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.fileUrl}
              alt={doc.name}
              className="mx-auto max-h-[60vh] w-auto object-contain"
            />
          </div>
        ) : pdf ? (
          <iframe
            src={doc.fileUrl}
            title={doc.name}
            className="h-[60vh] w-full rounded-xl border bg-background"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-12 text-center">
            <DocumentThumb doc={doc} size={72} />
            <div className="space-y-1">
              <p className="font-display text-base font-semibold">{doc.name}</p>
              <p className="text-sm text-muted-foreground">
                {(doc.format ?? doc.mimeType ?? "file").toUpperCase()} ·{" "}
                {formatBytes(doc.sizeBytes)}
              </p>
            </div>
            <Button asChild>
              <a
                href={downloadUrl(doc)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="size-4" /> Download / Open
              </a>
            </Button>
          </div>
        )}
      </div>
    </ViewModal>
  );
}
