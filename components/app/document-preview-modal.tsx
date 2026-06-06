"use client";

import { Download, ExternalLink } from "lucide-react";

import { ViewModal } from "@/components/app/view-modal";
import { Button } from "@/components/ui/button";
import {
  DocumentCategoryBadge,
  DocumentThumb,
  downloadUrl,
  isImageDoc,
  isPdfDoc,
} from "@/components/app/document-badges";
import { formatBytes } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
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

  return (
    <ViewModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={doc.name}
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <DocumentCategoryBadge category={doc.category} />
          <span className="text-muted-foreground">
            {formatBytes(doc.sizeBytes)}
          </span>
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
          <Button variant="outline" asChild>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Open
            </a>
          </Button>
          <Button asChild>
            <a href={downloadUrl(doc)} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" /> Download
            </a>
          </Button>
        </>
      }
    >
      <div className="px-1 py-1">
        {image ? (
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
