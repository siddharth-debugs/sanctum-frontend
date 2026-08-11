"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  FolderLock,
  Users,
  Upload,
  FileText,
  FileImage,
  FileVideo,
  Download,
  Trash2,
  ArrowLeftRight,
  MoreHorizontal,
  Loader2,
  Link2,
  ExternalLink,
  HardDrive,
  Cloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useUpdateDocument,
} from "@/hooks/use-documents";
import { DocumentUploadDialog } from "@/components/app/document-upload-dialog";
import { ApiError } from "@/lib/api/client";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { Document } from "@/lib/api/types";
import { ListSkeleton } from "./shared";

type Folder = "internal" | "external";

/** A document is a cloud link (Drive/OneDrive/…) rather than an uploaded file
 * when it has no Cloudinary publicId. */
function isLinkDoc(doc: Document): boolean {
  return !doc.publicId;
}

function linkProvider(doc: Document): { label: string; Icon: typeof Link2 } {
  switch (doc.format) {
    case "gdrive":
      return { label: "Google Drive", Icon: HardDrive };
    case "onedrive":
      return { label: "OneDrive", Icon: Cloud };
    case "dropbox":
      return { label: "Dropbox", Icon: Cloud };
    default:
      return { label: "Link", Icon: Link2 };
  }
}

function FileIcon({ doc }: { doc: Document }) {
  if (isLinkDoc(doc)) {
    const { Icon } = linkProvider(doc);
    return <Icon className="size-4 shrink-0 text-emerald-500" />;
  }
  const Icon =
    doc.resourceType === "image"
      ? FileImage
      : doc.resourceType === "video"
        ? FileVideo
        : FileText;
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

/**
 * Project files, split into two folders:
 *  - Internal: agency-only (clientVisible = false)
 *  - Client-facing: shared in the client portal (clientVisible = true)
 */
export function FilesTab({ projectId }: { projectId: string }) {
  const { data: docs, isLoading } = useDocuments({ projectId });
  const internal = React.useMemo(
    () => (docs ?? []).filter((d) => !d.clientVisible),
    [docs],
  );
  const external = React.useMemo(
    () => (docs ?? []).filter((d) => d.clientVisible),
    [docs],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <FolderSection
        folder="internal"
        title="Internal documents"
        description="Only your agency team can see these."
        icon={<FolderLock className="size-5 text-muted-foreground" />}
        projectId={projectId}
        docs={internal}
        loading={isLoading}
      />
      <FolderSection
        folder="external"
        title="Client-facing documents"
        description="Shared in the client portal — visible to the client and your team."
        icon={<Users className="size-5 text-success" />}
        projectId={projectId}
        docs={external}
        loading={isLoading}
      />
    </div>
  );
}

function FolderSection({
  folder,
  title,
  description,
  icon,
  projectId,
  docs,
  loading,
}: {
  folder: Folder;
  title: string;
  description: string;
  icon: React.ReactNode;
  projectId: string;
  docs: Document[];
  loading: boolean;
}) {
  const upload = useUploadDocument();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const clientVisible = folder === "external" ? 1 : 0;

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync({
          file,
          name: file.name,
          category: "misc",
          projectId,
          clientVisible: clientVisible as 0 | 1,
        });
        ok += 1;
      } catch {
        // useUploadDocument already toasts per-file failures.
      }
    }
    setUploading(false);
    if (ok > 0) {
      toast.success(
        `${ok} file${ok > 1 ? "s" : ""} uploaded to ${title.toLowerCase()}`,
      );
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-start gap-3 border-b p-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-medium">
            {title}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {docs.length}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLinkOpen(true)}
            title="Attach a Google Drive / OneDrive link (uses 0 storage)"
          >
            <Link2 className="size-4" />
            Add link
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload
          </Button>
        </div>
      </header>

      <DocumentUploadDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        lockedProjectId={projectId}
        defaultClientVisible={folder === "external"}
        defaultMode="link"
      />

      <div className="flex-1 p-2">
        {loading ? (
          <div className="p-2">
            <ListSkeleton rows={2} />
          </div>
        ) : docs.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Upload className="size-5" />
            No files yet — click to upload
          </button>
        ) : (
          <ul className="space-y-0.5">
            {docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} folder={folder} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DocRow({ doc, folder }: { doc: Document; folder: Folder }) {
  const move = useUpdateDocument();
  const del = useDeleteDocument();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const link = isLinkDoc(doc);
  const provider = linkProvider(doc);
  const moveLabel =
    folder === "internal" ? "Move to client-facing" : "Move to internal";

  function onMove() {
    move.mutate(
      { id: doc.id, patch: { clientVisible: folder === "internal" ? 1 : 0 } },
      {
        onSuccess: () => toast.success(moveLabel.replace("Move to", "Moved to")),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't move the file",
          ),
      },
    );
  }

  function onDelete() {
    del.mutate(doc.id, {
      onSuccess: () => {
        toast.success("File deleted");
        setConfirmOpen(false);
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't delete the file",
        ),
    });
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60",
        del.isPending && "opacity-50",
      )}
    >
      <FileIcon doc={doc} />
      <a
        href={doc.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-1.5 truncate text-sm font-medium group-hover:underline">
          {doc.name}
          {link && <ExternalLink className="size-3 shrink-0 text-muted-foreground" />}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {link ? provider.label : formatBytes(doc.sizeBytes)}
          {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ""} ·{" "}
          {formatDate(doc.createdAt)}
        </div>
      </a>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 opacity-60 group-hover:opacity-100"
            aria-label="File actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              {link ? (
                <>
                  <ExternalLink className="size-4" /> Open link
                </>
              ) : (
                <>
                  <Download className="size-4" /> Download
                </>
              )}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMove} disabled={move.isPending}>
            <ArrowLeftRight className="size-4" /> {moveLabel}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
            <DialogDescription>
              &ldquo;{doc.name}&rdquo; will be permanently removed
              {folder === "external" ? " for the client and your team" : ""}.
              This can&rsquo;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={del.isPending}
            >
              {del.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
