"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Search,
  Files,
  HardDrive,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Folder,
  FolderPlus,
  FolderInput,
  ChevronRight,
  Pencil,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { DataTable, DataTableColumnHeader } from "@/components/app/data-table";
import {
  DocumentCategoryBadge,
  DocumentThumb,
  downloadUrl,
} from "@/components/app/document-badges";
import { DocumentVisibleToggle } from "@/components/app/document-visible-toggle";
import { DocumentUploadDialog } from "@/components/app/document-upload-dialog";
import { DocumentPreviewModal } from "@/components/app/document-preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxStandalone } from "@/components/app/combobox-standalone";
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
import { useDocuments, useDeleteDocument, useUpdateDocument } from "@/hooks/use-documents";
import {
  useFolders,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  type DocumentFolder,
} from "@/hooks/use-document-folders";
import { useClients } from "@/hooks/use-clients";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useCan } from "../session-context";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatBytes } from "@/lib/utils";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/constants/document-options";
import type { Document } from "@/lib/api/types";

const ALL = "all";
const ROOT_VALUE = "__root__";

/** A single hop in the folder path (id `null` = the root, "All files"). */
interface Crumb {
  id: string | null;
  name: string;
}

export default function DocumentsPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const [clientId, setClientId] = React.useState("");
  const [path, setPath] = React.useState<Crumb[]>([
    { id: null, name: "All files" },
  ]);

  const currentFolderId = path[path.length - 1].id;
  const searching = search.trim().length > 0;

  const { canManage } = useCan();
  const canEdit = canManage("documents");

  // Dialogs
  const uploadDialog = useDisclosure();
  const preview = useDisclosure<Document>();
  const deleteDialog = useDisclosure<Document>();
  const moveDialog = useDisclosure<Document>();
  const newFolderDialog = useDisclosure();
  const renameDialog = useDisclosure<DocumentFolder>();
  const deleteFolderDialog = useDisclosure<DocumentFolder>();

  // Mutations
  const deleteDocument = useDeleteDocument();
  const updateDocument = useUpdateDocument();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  // Local input state for the folder dialogs
  const [newFolderName, setNewFolderName] = React.useState("");
  const [renameValue, setRenameValue] = React.useState("");
  const [moveTarget, setMoveTarget] = React.useState(ROOT_VALUE);

  const { data: clients } = useClients();

  // Folders at the current level (skipped visually while searching).
  const foldersQuery = useFolders({
    parentId: currentFolderId ?? "root",
    clientId: clientId || undefined,
  });
  const folders = React.useMemo(
    () => foldersQuery.data ?? [],
    [foldersQuery.data],
  );

  // Every folder (for the move-to-folder picker).
  const allFoldersQuery = useFolders({});

  const { data, isLoading, error } = useDocuments({
    category: category === ALL ? undefined : category,
    clientId: clientId || undefined,
    folderId: searching ? undefined : currentFolderId ?? "root",
    search: search.trim() || undefined,
  });

  // Client-side narrowing on top of the backend filters (mirrors other pages).
  const documents = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((d) => {
      if (category !== ALL && d.category !== category) return false;
      if (clientId && d.clientId !== clientId) return false;
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !(d.clientName ?? "").toLowerCase().includes(q) &&
        !(d.projectName ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, category, clientId]);

  const totalSize = React.useMemo(
    () => documents.reduce((s, d) => s + (d.sizeBytes || 0), 0),
    [documents],
  );

  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  // ── Folder navigation ──────────────────────────────────────────────
  const openFolder = React.useCallback((f: DocumentFolder) => {
    setPath((p) => [...p, { id: f.id, name: f.name }]);
  }, []);
  const navigateTo = React.useCallback((index: number) => {
    setPath((p) => p.slice(0, index + 1));
  }, []);

  // ── Document actions ───────────────────────────────────────────────
  const onDelete = React.useCallback(
    (doc: Document) => {
      deleteDocument.mutate(doc.id, {
        onSuccess: () => {
          toast.success("Document deleted");
          deleteDialog.onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Couldn't delete"),
      });
    },
    [deleteDocument, deleteDialog],
  );

  const openMove = React.useCallback(
    (doc: Document) => {
      setMoveTarget(currentFolderId ?? ROOT_VALUE);
      moveDialog.onOpen(doc);
    },
    [currentFolderId, moveDialog],
  );

  const onMoveFile = React.useCallback(() => {
    const doc = moveDialog.data;
    if (!doc) return;
    const folderId = moveTarget === ROOT_VALUE ? null : moveTarget;
    updateDocument.mutate(
      { id: doc.id, patch: { folderId } },
      {
        onSuccess: () => {
          toast.success("File moved");
          moveDialog.onClose();
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't move the file",
          ),
      },
    );
  }, [moveDialog, moveTarget, updateDocument]);

  // ── Folder mutations ───────────────────────────────────────────────
  const onCreateFolder = React.useCallback(() => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolder.mutate(
      { name, parentId: currentFolderId, clientId: clientId || null },
      {
        onSuccess: () => {
          toast.success("Folder created");
          setNewFolderName("");
          newFolderDialog.onClose();
        },
      },
    );
  }, [newFolderName, createFolder, currentFolderId, clientId, newFolderDialog]);

  const onRenameFolder = React.useCallback(() => {
    const f = renameDialog.data;
    const name = renameValue.trim();
    if (!f || !name) return;
    renameFolder.mutate(
      { id: f.id, name },
      {
        onSuccess: () => {
          toast.success("Folder renamed");
          renameDialog.onClose();
        },
      },
    );
  }, [renameDialog, renameValue, renameFolder]);

  const onDeleteFolder = React.useCallback(() => {
    const f = deleteFolderDialog.data;
    if (!f) return;
    deleteFolder.mutate(f.id, {
      onSuccess: () => {
        toast.success("Folder deleted — its files moved to the root");
        deleteFolderDialog.onClose();
      },
    });
  }, [deleteFolderDialog, deleteFolder]);

  const columns = React.useMemo<ColumnDef<Document>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => {
          const d = row.original;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                preview.onOpen(d);
              }}
              className="flex items-center gap-3 text-left"
            >
              <DocumentThumb doc={d} size={36} />
              <span className="line-clamp-1 max-w-[260px] text-sm font-medium hover:text-primary">
                {d.name}
              </span>
            </button>
          );
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => (
          <DocumentCategoryBadge category={row.original.category} />
        ),
      },
      {
        id: "client",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Client" />
        ),
        cell: ({ row }) => {
          const d = row.original;
          return d.clientId && d.clientName ? (
            <Link
              href={`/clients/${d.clientId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-primary hover:underline"
            >
              {d.clientName}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "project",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Project" />
        ),
        cell: ({ row }) => {
          const d = row.original;
          return d.projectId && d.projectName ? (
            <Link
              href={`/projects/${d.projectId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-primary hover:underline"
            >
              {d.projectName}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "sizeBytes",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Size" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatBytes(row.original.sizeBytes)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Added" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "clientVisible",
        header: () => <span className="text-center">Client-visible</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <DocumentVisibleToggle doc={row.original} />
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => preview.onOpen(d)}>
                    <Eye className="mr-2 size-4" /> Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={downloadUrl(d)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="mr-2 size-4" /> Download
                    </a>
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={() => openMove(d)}>
                      <FolderInput className="mr-2 size-4" /> Move to folder
                    </DropdownMenuItem>
                  )}
                  {canEdit && <DropdownMenuSeparator />}
                  {canEdit && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteDialog.onOpen(d)}
                    >
                      <Trash2 className="mr-2 size-4" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [preview, deleteDialog, openMove, canEdit],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <Files className="size-3" /> Documents
          </>
        }
        title="Document Hub"
        description="All client and project files in one place — organized in folders."
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  setNewFolderName("");
                  newFolderDialog.onOpen();
                }}
              >
                <FolderPlus className="size-4" /> New folder
              </Button>
            )}
            <Button onClick={() => uploadDialog.onOpen()}>
              <Plus className="size-4" /> Upload
            </Button>
          </div>
        }
      />

      {/* Breadcrumb path */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm">
        {path.map((c, i) => {
          const last = i === path.length - 1;
          return (
            <React.Fragment key={`${c.id ?? "root"}-${i}`}>
              {i > 0 && (
                <ChevronRight className="size-3.5 opacity-40" aria-hidden />
              )}
              {last ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  {i === 0 ? (
                    <HardDrive className="size-3.5" />
                  ) : (
                    <Folder className="size-3.5" />
                  )}
                  {c.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigateTo(i)}
                  className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {i === 0 ? (
                    <HardDrive className="size-3.5" />
                  ) : (
                    <Folder className="size-3.5" />
                  )}
                  {c.name}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Storage summary chip */}
      <div className="inline-flex items-center gap-2 rounded-full border bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-3.5 py-1.5 text-sm">
        <HardDrive className="size-4 text-primary" />
        <span className="font-semibold tabular-nums">{documents.length}</span>
        <span className="text-muted-foreground">
          {documents.length === 1 ? "file" : "files"}
        </span>
        <span className="opacity-40">•</span>
        <span className="font-semibold tabular-nums">
          {formatBytes(totalSize)}
        </span>
        <span className="text-muted-foreground">stored</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 lg:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all folders…"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {DOCUMENT_CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ComboboxStandalone
          value={clientId}
          onChange={setClientId}
          options={clientOptions}
          placeholder="All clients"
          emptyText="No clients."
          className="w-full lg:w-52"
        />
      </div>

      {/* Folders at this level (hidden while searching across all folders) */}
      {searching ? (
        <p className="text-xs text-muted-foreground">
          Showing search results across every folder.
        </p>
      ) : (
        (foldersQuery.isLoading || folders.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {foldersQuery.isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[60px] animate-pulse rounded-xl border bg-muted/40"
                  />
                ))
              : folders.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-3 transition-colors hover:border-primary/40"
                  >
                    <button
                      type="button"
                      onClick={() => openFolder(f)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
                        <Folder className="size-4" />
                      </span>
                      <span className="truncate text-sm font-medium group-hover:text-primary">
                        {f.name}
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
                          <DropdownMenuItem onClick={() => openFolder(f)}>
                            <Folder className="mr-2 size-4" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameValue(f.name);
                              renameDialog.onOpen(f);
                            }}
                          >
                            <Pencil className="mr-2 size-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteFolderDialog.onOpen(f)}
                          >
                            <Trash2 className="mr-2 size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
          </div>
        )
      )}

      <DataTable
        columns={columns}
        data={documents}
        isLoading={isLoading}
        error={error ? "Couldn't load documents. Please retry." : null}
        getRowId={(d) => d.id}
        onRowClick={(d) => preview.onOpen(d)}
        enableColumnVisibility={false}
        emptyIcon={<Files className="size-8" />}
        emptyTitle={
          currentFolderId ? "This folder is empty" : "No documents yet"
        }
        emptyDescription="Upload contracts, proposals, deliverables, and more — all in one place."
        emptyAction={
          <Button onClick={() => uploadDialog.onOpen()}>
            <Plus className="size-4" /> Upload document
          </Button>
        }
      />

      <DocumentUploadDialog
        open={uploadDialog.open}
        onOpenChange={uploadDialog.setOpen}
        folderId={currentFolderId}
      />

      <DocumentPreviewModal
        open={preview.open}
        onOpenChange={preview.setOpen}
        doc={preview.data}
      />

      {/* New folder */}
      <Dialog open={newFolderDialog.open} onOpenChange={newFolderDialog.setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder in{" "}
              <span className="font-medium text-foreground">
                {path[path.length - 1].name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-folder-name">Folder name</Label>
            <Input
              id="new-folder-name"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreateFolder();
              }}
              placeholder="e.g. Contracts"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => newFolderDialog.onClose()}>
              Cancel
            </Button>
            <Button
              onClick={onCreateFolder}
              disabled={createFolder.isPending || !newFolderName.trim()}
            >
              {createFolder.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderPlus className="size-4" />
              )}
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder */}
      <Dialog open={renameDialog.open} onOpenChange={renameDialog.setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-folder-name">Folder name</Label>
            <Input
              id="rename-folder-name"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameFolder();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => renameDialog.onClose()}>
              Cancel
            </Button>
            <Button
              onClick={onRenameFolder}
              disabled={renameFolder.isPending || !renameValue.trim()}
            >
              {renameFolder.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move file to folder */}
      <Dialog open={moveDialog.open} onOpenChange={moveDialog.setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
            <DialogDescription>
              {moveDialog.data
                ? `Choose where “${moveDialog.data.name}” should live.`
                : "Choose a destination folder."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Destination</Label>
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_VALUE}>Root (no folder)</SelectItem>
                {(allFoldersQuery.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => moveDialog.onClose()}>
              Cancel
            </Button>
            <Button onClick={onMoveFile} disabled={updateDocument.isPending}>
              {updateDocument.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderInput className="size-4" />
              )}
              Move file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete document */}
      <Dialog open={deleteDialog.open} onOpenChange={deleteDialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>
              {deleteDialog.data?.name
                ? `“${deleteDialog.data.name}” will be permanently removed. This can't be undone.`
                : "This file will be permanently removed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => deleteDialog.onClose()}
              disabled={deleteDocument.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.data && onDelete(deleteDialog.data)}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? "Deleting…" : "Delete document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder */}
      <Dialog
        open={deleteFolderDialog.open}
        onOpenChange={deleteFolderDialog.setOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this folder?</DialogTitle>
            <DialogDescription>
              {deleteFolderDialog.data?.name
                ? `“${deleteFolderDialog.data.name}” will be removed. Its files and any subfolders are kept and moved back to the root — nothing is deleted.`
                : "The folder will be removed; its files are kept."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => deleteFolderDialog.onClose()}
              disabled={deleteFolder.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteFolder}
              disabled={deleteFolder.isPending}
            >
              {deleteFolder.isPending ? "Deleting…" : "Delete folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
