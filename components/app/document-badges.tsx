import { cn } from "@/lib/utils";
import type { Document, DocumentCategory } from "@/lib/api/types";
import {
  DOCUMENT_CATEGORY_CLASS,
  DOCUMENT_CATEGORY_ICON,
  DOCUMENT_CATEGORY_LABEL,
} from "@/lib/constants/document-options";

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

/** Category pill, Evergreen-tokened with a per-category lucide icon. */
export function DocumentCategoryBadge({
  category,
  className,
}: {
  category: DocumentCategory;
  className?: string;
}) {
  const Icon = DOCUMENT_CATEGORY_ICON[category];
  return (
    <span className={cn(pill, DOCUMENT_CATEGORY_CLASS[category], className)}>
      <Icon className="size-3" />
      {DOCUMENT_CATEGORY_LABEL[category]}
    </span>
  );
}

/**
 * Build a force-download URL. For Cloudinary delivery URLs we inject the
 * `fl_attachment` transformation so the browser downloads instead of opening;
 * anything else is returned untouched.
 */
export function downloadUrl(doc: Pick<Document, "fileUrl">) {
  const url = doc.fileUrl;
  if (url.includes("/upload/") && !url.includes("fl_attachment")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
}

/** True when a document is a previewable raster image. */
export function isImageDoc(doc: Pick<Document, "resourceType" | "mimeType">) {
  return (
    doc.resourceType === "image" ||
    (doc.mimeType?.startsWith("image/") ?? false)
  );
}

/** True when a document is a PDF (rendered inline via <iframe>). */
export function isPdfDoc(
  doc: Pick<Document, "mimeType" | "format" | "name">,
) {
  return (
    doc.mimeType === "application/pdf" ||
    doc.format === "pdf" ||
    doc.name.toLowerCase().endsWith(".pdf")
  );
}

/**
 * A small square file tile: an image thumbnail for images, otherwise the
 * category icon on a tinted Evergreen surface. Sized via `size` (px).
 */
export function DocumentThumb({
  doc,
  size = 36,
  className,
}: {
  doc: Document;
  size?: number;
  className?: string;
}) {
  const Icon = DOCUMENT_CATEGORY_ICON[doc.category];
  if (isImageDoc(doc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doc.fileUrl}
        alt={doc.name}
        width={size}
        height={size}
        loading="lazy"
        className={cn(
          "shrink-0 rounded-md border object-cover",
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md text-primary",
        DOCUMENT_CATEGORY_CLASS[doc.category],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon className="size-1/2" />
    </span>
  );
}
