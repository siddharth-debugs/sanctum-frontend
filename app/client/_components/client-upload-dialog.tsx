"use client";

import * as React from "react";
import {
  UploadCloud,
  File as FileIcon,
  X,
  Loader2,
  HardDrive,
  Cloud,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useClientUploadDocument,
  useClientCreateLink,
} from "@/hooks/use-client-portal";
import { detectUrlFormat } from "@/hooks/use-documents";
import { cn, formatBytes } from "@/lib/utils";

/**
 * The client-portal "Add file" dialog. Mirrors the agency Add-Document dialog
 * (Upload File / Google Drive · OneDrive tabs) but scoped to the client's own
 * space — everything is created client-visible into the current folder.
 */
export function ClientUploadDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  defaultMode = "upload",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Folder to add into; null = the root of the client's shared space. */
  folderId: string | null;
  folderName: string;
  defaultMode?: "upload" | "link";
}) {
  const uploadDoc = useClientUploadDocument();
  const createLink = useClientCreateLink();

  const [mode, setMode] = React.useState<"upload" | "link">(defaultMode);
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setFile(null);
      setName("");
      setUrl("");
      setDragging(false);
      setProgress(0);
    }
  }, [open, defaultMode]);

  const pending = uploadDoc.isPending || createLink.isPending;
  const detectedFormat = url ? detectUrlFormat(url) : null;

  function pickFile(f: File | null | undefined) {
    if (f) {
      setFile(f);
      if (!name) setName(f.name);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  function submit() {
    if (mode === "upload") {
      if (!file) {
        toast.error("Pick a file to upload first.");
        return;
      }
      setProgress(0);
      uploadDoc.mutate(
        {
          file,
          name: name.trim() || file.name,
          folderId,
          onProgress: setProgress,
        },
        {
          onSuccess: () => {
            toast.success("File uploaded");
            onOpenChange(false);
          },
        },
      );
    } else {
      if (!url.trim()) {
        toast.error("Enter a Google Drive, OneDrive, or cloud link.");
        return;
      }
      if (!name.trim()) {
        toast.error("Enter a name for this link.");
        return;
      }
      createLink.mutate(
        { name: name.trim(), url: url.trim(), folderId },
        {
          onSuccess: () => {
            toast.success("Link added");
            onOpenChange(false);
          },
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Add a file</DialogTitle>
          <DialogDescription>
            Uploading to{" "}
            <span className="font-medium text-foreground">{folderName}</span> —
            your team will be able to see it.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "upload" | "link")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" disabled={pending} className="gap-2">
              <UploadCloud className="size-4" /> Upload File
            </TabsTrigger>
            <TabsTrigger value="link" disabled={pending} className="gap-2">
              <HardDrive className="size-4 text-emerald-500" /> Google Drive /
              OneDrive
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {mode === "upload" ? (
            <>
              {!file ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      inputRef.current?.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] px-4 py-10 text-center text-sm text-muted-foreground transition-colors hover:border-ring hover:text-primary",
                    dragging &&
                      "border-primary bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-primary",
                  )}
                >
                  <UploadCloud className="size-7" strokeWidth={1.5} />
                  <span>
                    Drag &amp; drop a file or{" "}
                    <span className="font-semibold text-primary">browse</span>
                  </span>
                  <span className="text-[11px]">Any file type</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
                    <FileIcon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  {!pending && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setFile(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0])}
              />

              {uploadDoc.isPending && (
                <div className="space-y-1.5">
                  <Progress value={progress} />
                  <p className="text-right text-xs text-muted-foreground tabular-nums">
                    {progress}%
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 rounded-xl border bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Supported
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <HardDrive className="size-3" /> Google Drive
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    <Cloud className="size-3" /> OneDrive
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-link-url">Link URL</Label>
                <Input
                  id="client-link-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/… or https://1drv.ms/…"
                  disabled={pending}
                />
              </div>
              {detectedFormat && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {detectedFormat === "gdrive" ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <HardDrive className="size-3.5" /> Google Drive link
                    </span>
                  ) : detectedFormat === "onedrive" ? (
                    <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <Cloud className="size-3.5" /> OneDrive link
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Link2 className="size-3.5" /> External link
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="client-file-name">Name</Label>
            <Input
              id="client-file-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                mode === "upload" ? "File name" : "e.g. Brand assets (Drive)"
              }
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={
              pending ||
              (mode === "upload" && !file) ||
              (mode === "link" && !url.trim())
            }
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving…
              </>
            ) : mode === "upload" ? (
              <>
                <UploadCloud className="size-4" /> Upload
              </>
            ) : (
              <>
                <Link2 className="size-4" /> Add link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
