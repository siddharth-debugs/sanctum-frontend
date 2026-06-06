import {
  FileSignature,
  ShieldCheck,
  FileText,
  Package,
  ReceiptText,
  BarChart3,
  Palette,
  Sparkles,
  File,
  type LucideIcon,
} from "lucide-react";
import type { SelectOption } from "@/components/fields";
import type { DocumentCategory } from "@/lib/api/types";

/** Category options for the upload form + filters (order = display order). */
export const DOCUMENT_CATEGORY_OPTIONS: SelectOption[] = [
  { label: "Contract", value: "contract" },
  { label: "NDA", value: "nda" },
  { label: "Proposal", value: "proposal" },
  { label: "Deliverable", value: "deliverable" },
  { label: "Invoice", value: "invoice" },
  { label: "Report", value: "report" },
  { label: "Design", value: "design" },
  { label: "AI generated", value: "ai_generated" },
  { label: "Misc", value: "misc" },
];

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  contract: "Contract",
  nda: "NDA",
  proposal: "Proposal",
  deliverable: "Deliverable",
  invoice: "Invoice",
  report: "Report",
  design: "Design",
  ai_generated: "AI generated",
  misc: "Misc",
};

/** A lucide icon per category — used in badges and (as a fallback) file tiles. */
export const DOCUMENT_CATEGORY_ICON: Record<DocumentCategory, LucideIcon> = {
  contract: FileSignature,
  nda: ShieldCheck,
  proposal: FileText,
  deliverable: Package,
  invoice: ReceiptText,
  report: BarChart3,
  design: Palette,
  ai_generated: Sparkles,
  misc: File,
};

/**
 * Evergreen-token pill classes per category. We lean on the theme's accent /
 * primary / success / warning / destructive / muted tokens so categories stay
 * on-brand in both light and dark surfaces.
 */
export const DOCUMENT_CATEGORY_CLASS: Record<DocumentCategory, string> = {
  contract:
    "text-primary bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
  nda: "text-destructive bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)]",
  proposal:
    "text-accent bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]",
  deliverable:
    "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]",
  invoice:
    "text-warning bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]",
  report:
    "text-primary bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]",
  design: "text-accent bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]",
  ai_generated:
    "text-success bg-[color-mix(in_srgb,var(--success)_14%,transparent)]",
  misc: "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]",
};
