import {
  Download,
  ExternalLink,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  ChevronRight,
  Link2,
  type LucideIcon,
} from "lucide-react";

import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { ClientFile } from "@/lib/api/types";
import { humanize } from "./portal-bits";

function iconFor(file: ClientFile): LucideIcon {
  if (file.isLink) return Link2;
  const rt = file.resourceType?.toLowerCase();
  if (rt === "image") return FileImage;
  if (rt === "video") return FileVideo;
  return FileText;
}

/** One shared file/link, opening in a new tab. Read-only. */
export function FileRow({
  file,
  className,
}: {
  file: ClientFile;
  className?: string;
}) {
  const Icon = iconFor(file);
  const Action = file.isLink ? ExternalLink : Download;
  return (
    <a
      href={file.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-[var(--glass-border)] bg-card/40 px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--glass-border))] hover:bg-card/70",
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {humanize(file.category)}
          {" · "}
          {file.isLink ? "Link" : formatBytes(file.sizeBytes)}
          {file.createdAt ? ` · ${formatDate(file.createdAt)}` : ""}
        </p>
      </div>
      <Action className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </a>
  );
}

/** One navigable folder row (read-only portal). Opens the folder in place. */
export function FolderRow({
  name,
  onOpen,
  className,
}: {
  name: string;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border border-[var(--glass-border)] bg-card/40 px-3 py-2.5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--glass-border))] hover:bg-card/70",
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        <Folder className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">Folder</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  );
}
