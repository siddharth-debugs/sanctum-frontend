"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SelectField,
  ComboboxField,
  SwitchField,
  TextField,
} from "@/components/fields";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/constants/document-options";
import {
  useUploadDocument,
  useCreateLinkedDocument,
  detectUrlFormat,
} from "@/hooks/use-documents";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { cn, formatBytes } from "@/lib/utils";
import type { DocumentCategory } from "@/lib/api/types";

const FORM_ID = "document-upload-form";

interface UploadFormValues {
  mode: "upload" | "link";
  name: string;
  url: string;
  category: DocumentCategory;
  clientId: string;
  projectId: string;
  clientVisible: boolean;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  /** Pre-selected (and locked) client — used from the client Files tab. */
  lockedClientId,
  /** Pre-selected (and locked) project — used from the project Files tab. */
  lockedProjectId,
  /** Sanctum document folder to upload into (DB construct). null/undefined = root. */
  folderId,
  defaultCategory = "misc",
  /** Pre-set the client-portal visibility (e.g. the "Client-facing" folder). */
  defaultClientVisible = false,
  /** Open on the "upload" or "link" tab first. */
  defaultMode = "upload",
  /** Hide the cloud-link tab entirely — file upload only. */
  uploadOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedClientId?: string;
  lockedProjectId?: string;
  folderId?: string | null;
  defaultCategory?: DocumentCategory;
  defaultClientVisible?: boolean;
  defaultMode?: "upload" | "link";
  uploadOnly?: boolean;
}) {
  const initialMode = uploadOnly ? "upload" : defaultMode;
  const upload = useUploadDocument();
  const createLink = useCreateLinkedDocument();
  const { data: clients } = useClients();
  const { data: projects } = useProjects();

  const [mode, setMode] = React.useState<"upload" | "link">(initialMode);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormValues>({
    defaultValues: {
      mode: defaultMode,
      name: "",
      url: "",
      category: defaultCategory,
      clientId: lockedClientId ?? "",
      projectId: lockedProjectId ?? "",
      clientVisible: defaultClientVisible,
    },
  });

  React.useEffect(() => {
    if (open) {
      setMode(initialMode);
      setFile(null);
      setProgress(0);
      setDragging(false);
      form.reset({
        mode: initialMode,
        name: "",
        url: "",
        category: defaultCategory,
        clientId: lockedClientId ?? "",
        projectId: lockedProjectId ?? "",
        clientVisible: defaultClientVisible,
      });
    }
  }, [
    open,
    lockedClientId,
    lockedProjectId,
    defaultCategory,
    defaultClientVisible,
    initialMode,
    form,
  ]);

  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const selectedClientId = useWatch({ control: form.control, name: "clientId" });
  const projectOptions = React.useMemo(
    () =>
      (projects ?? [])
        .filter((p) => !selectedClientId || p.clientId === selectedClientId)
        .map((p) => ({ label: p.name, value: p.id })),
    [projects, selectedClientId],
  );

  const linkUrl = useWatch({ control: form.control, name: "url" });
  const detectedFormat = React.useMemo(
    () => (linkUrl ? detectUrlFormat(linkUrl) : null),
    [linkUrl],
  );

  const pickFile = (f: File | null | undefined) => {
    if (f) {
      setFile(f);
      if (!form.getValues("name")) {
        form.setValue("name", f.name);
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const onSubmit = (values: UploadFormValues) => {
    if (mode === "upload") {
      if (!file) {
        toast.error("Pick a file to upload first.");
        return;
      }
      setProgress(0);
      upload.mutate(
        {
          file,
          name: values.name.trim() || file.name,
          category: values.category,
          clientId: values.clientId || null,
          projectId: values.projectId || null,
          folderId: folderId ?? null,
          clientVisible: values.clientVisible ? 1 : 0,
          onProgress: setProgress,
        },
        {
          onSuccess: () => {
            toast.success("Document uploaded");
            onOpenChange(false);
          },
        },
      );
    } else {
      if (!values.url.trim()) {
        toast.error("Enter a Google Drive, OneDrive, or cloud link.");
        return;
      }
      if (!values.name.trim()) {
        toast.error("Enter a title for this link.");
        return;
      }
      createLink.mutate(
        {
          name: values.name.trim(),
          url: values.url.trim(),
          category: values.category,
          clientId: values.clientId || null,
          projectId: values.projectId || null,
          folderId: folderId ?? null,
          clientVisible: values.clientVisible ? 1 : 0,
        },
        {
          onSuccess: () => {
            toast.success(
              detectedFormat === "gdrive"
                ? "Google Drive link attached"
                : detectedFormat === "onedrive"
                  ? "OneDrive link attached"
                  : "Cloud link attached",
            );
            onOpenChange(false);
          },
        },
      );
    }
  };

  const pending = upload.isPending || createLink.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {uploadOnly ? "Upload File" : "Add Document"}
          </DialogTitle>
          <DialogDescription>
            {uploadOnly
              ? "Upload a file to this folder."
              : "Upload a file directly or attach a Google Drive / OneDrive link to save storage space."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector (hidden when the surface only allows file uploads) */}
        {!uploadOnly && (
          <Tabs
            value={mode}
            onValueChange={(val) => setMode(val as "upload" | "link")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" disabled={pending} className="gap-2">
                <UploadCloud className="size-4" /> Upload File
              </TabsTrigger>
              <TabsTrigger value="link" disabled={pending} className="gap-2">
                <HardDrive className="size-4 text-emerald-500" /> Google Drive / OneDrive
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Form {...form}>
          <form
            id={FORM_ID}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {mode === "upload" ? (
              <>
                {/* Dropzone */}
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
                    <span className="text-[11px]">Any file type · stored on Cloudinary</span>
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

                {upload.isPending && (
                  <div className="space-y-1.5">
                    <Progress value={progress} />
                    <p className="text-right text-xs text-muted-foreground tabular-nums">
                      {progress}%
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Cloud Link Input */}
                <div className="space-y-3 rounded-xl border bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Supported Providers
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

                  <TextField
                    control={form.control}
                    name="url"
                    label="Link URL"
                    placeholder="https://drive.google.com/file/d/... or https://1drv.ms/..."
                    disabled={pending}
                    required
                  />

                  {detectedFormat && (
                    <div className="flex items-center gap-2 text-xs font-medium">
                      {detectedFormat === "gdrive" ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <HardDrive className="size-3.5" /> Recognized Google Drive link (uses 0 B storage)
                        </span>
                      ) : detectedFormat === "onedrive" ? (
                        <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                          <Cloud className="size-3.5" /> Recognized OneDrive link (uses 0 B storage)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <Link2 className="size-3.5" /> External link attached
                        </span>
                      )}
                    </div>
                  )}

                  <TextField
                    control={form.control}
                    name="name"
                    label="Document Name"
                    placeholder="e.g. Q3 Design Assets (Google Drive)"
                    disabled={pending}
                    required
                  />
                </div>
              </>
            )}

            <SelectField
              control={form.control}
              name="category"
              label="Category"
              placeholder="Select category"
              options={DOCUMENT_CATEGORY_OPTIONS}
              disabled={pending}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ComboboxField
                control={form.control}
                name="clientId"
                label="Client"
                placeholder="Select client (optional)"
                options={clientOptions}
                disabled={pending || !!lockedClientId}
              />
              <ComboboxField
                control={form.control}
                name="projectId"
                label="Project"
                placeholder="Select project (optional)"
                options={projectOptions}
                emptyText="No projects for this client."
                disabled={pending || !!lockedProjectId}
              />
            </div>

            <SwitchField
              control={form.control}
              name="clientVisible"
              label="Make visible to the client"
              description="Show this file in the client portal."
              disabled={pending}
            />
          </form>
        </Form>

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
            type="submit"
            form={FORM_ID}
            disabled={pending || (mode === "upload" && !file) || (mode === "link" && !linkUrl)}
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
                <Link2 className="size-4" /> Attach Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
