"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Files as FilesIcon,
  ChevronRight,
  ChevronLeft,
  FolderOpen,
  FolderPlus,
  Upload,
  Loader2,
} from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useClientFiles,
  useClientFolders,
  useClientUploadDocument,
  useClientCreateFolder,
} from "@/hooks/use-client-portal";
import { FileRow, FolderRow } from "../_components/file-row";
import { EmptyState, ErrorState } from "../_components/portal-bits";
import { ClientUploadDialog } from "../_components/client-upload-dialog";
import { cn } from "@/lib/utils";

interface Crumb {
  id: string | null;
  name: string;
}

export default function ClientFilesPage() {
  const [path, setPath] = React.useState<Crumb[]>([{ id: null, name: "Files" }]);
  const currentFolderId = path[path.length - 1].id;
  const currentFolderName = path[path.length - 1].name;

  const files = useClientFiles();
  const foldersQuery = useClientFolders();
  const uploadDoc = useClientUploadDocument();
  const createFolder = useClientCreateFolder();

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");

  const allFolders = React.useMemo(
    () => foldersQuery.data ?? [],
    [foldersQuery.data],
  );
  const list = React.useMemo(() => files.data ?? [], [files.data]);

  // The set of folders the client is allowed to see. A shared file inside a
  // non-visible folder falls back to the root.
  const visibleIds = React.useMemo(
    () => new Set(allFolders.map((f) => f.id)),
    [allFolders],
  );

  const folders = React.useMemo(
    () => allFolders.filter((f) => (f.parentId ?? null) === currentFolderId),
    [allFolders, currentFolderId],
  );

  const filesHere = React.useMemo(
    () =>
      list.filter((f) => {
        const fid = f.folderId ?? null;
        if (currentFolderId === null) {
          return fid === null || !visibleIds.has(fid);
        }
        return fid === currentFolderId;
      }),
    [list, currentFolderId, visibleIds],
  );

  const loading = files.isLoading || foldersQuery.isLoading;
  const isError = files.isError || foldersQuery.isError;
  const nothingHere =
    !loading && folders.length === 0 && filesHere.length === 0;

  function openFolder(id: string, name: string) {
    setPath((p) => [...p, { id, name }]);
  }
  function navigateTo(index: number) {
    setPath((p) => p.slice(0, index + 1));
  }

  async function onFiles(fl: FileList | null) {
    if (!fl || fl.length === 0) return;
    let ok = 0;
    for (const file of Array.from(fl)) {
      try {
        await uploadDoc.mutateAsync({
          file,
          name: file.name,
          folderId: currentFolderId,
        });
        ok += 1;
      } catch {
        // useClientUploadDocument toasts failures.
      }
    }
    if (ok > 0) {
      toast.success(
        `${ok} file${ok > 1 ? "s" : ""} uploaded to ${currentFolderName.toLowerCase()}`,
      );
    }
  }

  function submitFolder() {
    const name = folderName.trim();
    if (!name) return;
    createFolder.mutate(
      { name, parentId: currentFolderId },
      {
        onSuccess: () => {
          toast.success("Folder created");
          setNewFolderOpen(false);
          setFolderName("");
        },
      },
    );
  }

  const uploading = uploadDoc.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Files
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading shared files…"
              : `${list.length} file${list.length === 1 ? "" : "s"} shared with you`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFolderName("");
              setNewFolderOpen(true);
            }}
          >
            <FolderPlus className="size-4" /> New folder
          </Button>
          <Button size="sm" disabled={uploading} onClick={() => setUploadOpen(true)}>
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Add file
          </Button>
        </div>
      </div>

      {/* Breadcrumb + back */}
      {path.length > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => navigateTo(path.length - 2)}
          >
            <ChevronLeft className="size-4" /> Back
          </Button>
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {path.map((c, i) => {
              const last = i === path.length - 1;
              return (
                <React.Fragment key={`${c.id ?? "root"}-${i}`}>
                  {i > 0 && <ChevronRight className="size-3.5 opacity-40" />}
                  {last ? (
                    <span className="font-semibold text-foreground">
                      {c.name}
                    </span>
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
          </nav>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          onRetry={() => {
            files.refetch();
            foldersQuery.refetch();
          }}
        />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragging) setDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          className={cn(
            "relative rounded-2xl transition-colors",
            dragging &&
              "outline-2 outline-dashed outline-primary/60 outline-offset-4",
          )}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-sm font-medium text-primary">
              <span className="flex items-center gap-2">
                <Upload className="size-4" /> Drop to upload here
              </span>
            </div>
          )}

          {nothingHere ? (
            <EmptyState
              className="py-10"
              icon={currentFolderId ? FolderOpen : FilesIcon}
              title={
                currentFolderId ? "This folder is empty" : "No files here yet"
              }
              hint="Drag & drop a file here, or add one — your team will see it too."
              action={
                <>
                  <Button size="sm" disabled={uploading} onClick={() => setUploadOpen(true)}>
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Add file
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFolderName("");
                      setNewFolderOpen(true);
                    }}
                  >
                    <FolderPlus className="size-4" /> New folder
                  </Button>
                </>
              }
            />
          ) : (
            <div className="space-y-5">
              {folders.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Folders
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {folders.map((f) => (
                      <FolderRow
                        key={f.id}
                        name={f.name}
                        onOpen={() => openFolder(f.id, f.name)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {filesHere.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Files
                  </h2>
                  <GlassCard className="space-y-1.5 p-2.5">
                    {filesHere.map((f) => (
                      <FileRow
                        key={f.id}
                        file={f}
                        className="border-transparent bg-transparent hover:bg-card/60"
                      />
                    ))}
                  </GlassCard>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      <ClientUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folderId={currentFolderId}
        folderName={currentFolderName}
      />

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder in{" "}
              <span className="font-medium text-foreground">
                {currentFolderName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="client-new-folder">Folder name</Label>
            <Input
              id="client-new-folder"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitFolder();
              }}
              placeholder="e.g. Brand Assets"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitFolder}
              disabled={!folderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
