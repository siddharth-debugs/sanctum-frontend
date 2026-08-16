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
  Folder,
  FolderPlus,
  ChevronRight,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useFolders,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  type DocumentFolder,
} from "@/hooks/use-document-folders";
import { DocumentUploadDialog } from "@/components/app/document-upload-dialog";
import { useCan } from "../../../session-context";
import { ApiError } from "@/lib/api/client";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { Document } from "@/lib/api/types";
import { ListSkeleton } from "./shared";

type Folder = "internal" | "external";
interface Crumb {
  id: string | null;
  name: string;
}

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
 * Each split has its own nestable folder tree.
 */
export function FilesTab({ projectId }: { projectId: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <FolderSection
        folder="internal"
        title="Internal documents"
        description="Only your agency team can see these."
        icon={<FolderLock className="size-5 text-muted-foreground" />}
        projectId={projectId}
      />
      <FolderSection
        folder="external"
        title="Client-facing documents"
        description="Shared in the client portal — visible to the client and your team."
        icon={<Users className="size-5 text-success" />}
        projectId={projectId}
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
}: {
  folder: Folder;
  title: string;
  description: string;
  icon: React.ReactNode;
  projectId: string;
}) {
  const isClientFacing = folder === "external";
  const { canManage } = useCan();
  const canEdit = canManage("documents");

  const [path, setPath] = React.useState<Crumb[]>([{ id: null, name: title }]);
  const currentFolderId = path[path.length - 1].id;
  const currentFolderName = path[path.length - 1].name;

  const upload = useUploadDocument();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  const [uploading, setUploading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  // The shared Add-Document dialog, opened file-upload-only from this surface.
  const [uploadOpen, setUploadOpen] = React.useState(false);

  // Folder dialogs
  const [folderDialog, setFolderDialog] = React.useState<
    { mode: "create" | "rename"; folder?: DocumentFolder } | null
  >(null);
  const [folderName, setFolderName] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<DocumentFolder | null>(
    null,
  );

  // Folders + docs at the current level, filtered to this section's visibility.
  const foldersQuery = useFolders({
    projectId,
    parentId: currentFolderId ?? "root",
  });
  const folders = React.useMemo(
    () =>
      (foldersQuery.data ?? []).filter(
        (f) => Boolean(f.clientVisible) === isClientFacing,
      ),
    [foldersQuery.data, isClientFacing],
  );

  const docsQuery = useDocuments({
    projectId,
    folderId: currentFolderId ?? "root",
  });
  const docs = React.useMemo(
    () =>
      (docsQuery.data ?? []).filter(
        (d) => Boolean(d.clientVisible) === isClientFacing,
      ),
    [docsQuery.data, isClientFacing],
  );

  const loading = foldersQuery.isLoading || docsQuery.isLoading;

  function openFolder(f: DocumentFolder) {
    setPath((p) => [...p, { id: f.id, name: f.name }]);
  }
  function navigateTo(index: number) {
    setPath((p) => p.slice(0, index + 1));
  }

  // Quick drag-and-drop upload straight into the current folder.
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
          folderId: currentFolderId,
          clientVisible: isClientFacing ? 1 : 0,
        });
        ok += 1;
      } catch {
        // useUploadDocument already toasts per-file failures.
      }
    }
    setUploading(false);
    if (ok > 0) {
      toast.success(
        `${ok} file${ok > 1 ? "s" : ""} uploaded to ${currentFolderName.toLowerCase()}`,
      );
    }
  }

  function submitFolder() {
    const name = folderName.trim();
    if (!name || !folderDialog) return;
    if (folderDialog.mode === "create") {
      createFolder.mutate(
        {
          name,
          projectId,
          parentId: currentFolderId,
          clientVisible: isClientFacing,
        },
        {
          onSuccess: () => {
            toast.success("Folder created");
            setFolderDialog(null);
          },
        },
      );
    } else if (folderDialog.folder) {
      renameFolder.mutate(
        { id: folderDialog.folder.id, name },
        {
          onSuccess: () => {
            toast.success("Folder renamed");
            setFolderDialog(null);
          },
        },
      );
    }
  }

  function confirmDeleteFolder() {
    if (!deleteTarget) return;
    deleteFolder.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Folder deleted — its files moved up");
        setDeleteTarget(null);
      },
    });
  }

  const empty = !loading && folders.length === 0 && docs.length === 0;

  const dropHandlers = canEdit
    ? {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        },
        onDragLeave: (e: React.DragEvent) => {
          // Only clear when leaving the panel itself, not its children.
          if (e.currentTarget === e.target) setDragging(false);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        },
      }
    : {};

  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-start gap-3 border-b p-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-medium">
            {title}
            {folders.length + docs.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                {folders.length + docs.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFolderName("");
                setFolderDialog({ mode: "create" });
              }}
              title="Create a folder here"
            >
              <FolderPlus className="size-4" />
              Folder
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => setUploadOpen(true)}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
          </div>
        )}
      </header>

      {/* Breadcrumb (only once navigated into a subfolder) */}
      {path.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 border-b px-4 py-2 text-xs text-muted-foreground">
          {path.map((c, i) => {
            const last = i === path.length - 1;
            return (
              <React.Fragment key={`${c.id ?? "root"}-${i}`}>
                {i > 0 && <ChevronRight className="size-3 opacity-40" />}
                {last ? (
                  <span className="font-medium text-foreground">{c.name}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateTo(i)}
                    className="transition-colors hover:text-foreground"
                  >
                    {c.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        lockedProjectId={projectId}
        folderId={currentFolderId}
        defaultClientVisible={isClientFacing}
        defaultMode="upload"
      />

      <div
        {...dropHandlers}
        className={cn(
          "relative flex-1 p-3",
          dragging &&
            "rounded-b-xl outline-2 outline-dashed outline-primary/60 -outline-offset-4",
        )}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-sm font-medium text-primary">
            <span className="flex items-center gap-2">
              <Upload className="size-4" /> Drop to upload here
            </span>
          </div>
        )}

        {loading ? (
          <div className="p-1">
            <ListSkeleton rows={2} />
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-9 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
              <Upload className="size-5" />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">No files yet</p>
              <p className="text-xs text-muted-foreground">
                {canEdit
                  ? "Drag & drop a file, or use Upload to add a file or cloud link."
                  : "Nothing has been added here yet."}
              </p>
            </div>
            {canEdit && (
              <Button size="sm" className="mt-1" onClick={() => setUploadOpen(true)}>
                <Upload className="size-4" /> Upload
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {folders.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {folders.map((f) => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    canEdit={canEdit}
                    onOpen={() => openFolder(f)}
                    onRename={() => {
                      setFolderName(f.name);
                      setFolderDialog({ mode: "rename", folder: f });
                    }}
                    onDelete={() => setDeleteTarget(f)}
                  />
                ))}
              </div>
            )}
            {docs.length > 0 && (
              <ul className="space-y-0.5">
                {docs.map((doc) => (
                  <DocRow key={doc.id} doc={doc} folder={folder} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Create / rename folder */}
      <Dialog
        open={folderDialog !== null}
        onOpenChange={(o) => !o && setFolderDialog(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {folderDialog?.mode === "rename" ? "Rename folder" : "New folder"}
            </DialogTitle>
            {folderDialog?.mode !== "rename" && (
              <DialogDescription>
                Create a folder in{" "}
                <span className="font-medium text-foreground">
                  {currentFolderName}
                </span>
                .
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`folder-name-${folder}`}>Folder name</Label>
            <Input
              id={`folder-name-${folder}`}
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitFolder();
              }}
              placeholder="e.g. Deliverables"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFolderDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitFolder}
              disabled={
                !folderName.trim() ||
                createFolder.isPending ||
                renameFolder.isPending
              }
            >
              {(createFolder.isPending || renameFolder.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {folderDialog?.mode === "rename" ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be removed. Its files and
              subfolders are kept and moved back up — nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteFolder}
              disabled={deleteFolder.isPending}
            >
              {deleteFolder.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Delete folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FolderCard({
  folder,
  canEdit,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: DocumentFolder;
  canEdit: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-primary/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
          <Folder className="size-4" />
        </span>
        <span className="truncate text-sm font-medium group-hover:text-primary">
          {folder.name}
        </span>
      </button>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 opacity-60 group-hover:opacity-100"
              aria-label="Folder actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>
              <Folder className="size-4" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
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
