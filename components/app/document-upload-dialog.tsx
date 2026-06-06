"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { UploadCloud, File as FileIcon, X, Loader2 } from "lucide-react";
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
import { SelectField, ComboboxField, SwitchField } from "@/components/fields";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/constants/document-options";
import { useUploadDocument } from "@/hooks/use-documents";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { cn, formatBytes } from "@/lib/utils";
import type { DocumentCategory } from "@/lib/api/types";

const FORM_ID = "document-upload-form";

interface UploadFormValues {
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
  defaultCategory = "misc",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedClientId?: string;
  defaultCategory?: DocumentCategory;
}) {
  const upload = useUploadDocument();
  const { data: clients } = useClients();
  const { data: projects } = useProjects();

  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormValues>({
    defaultValues: {
      category: defaultCategory,
      clientId: lockedClientId ?? "",
      projectId: "",
      clientVisible: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      setFile(null);
      setProgress(0);
      setDragging(false);
      form.reset({
        category: defaultCategory,
        clientId: lockedClientId ?? "",
        projectId: "",
        clientVisible: false,
      });
    }
  }, [open, lockedClientId, defaultCategory, form]);

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

  const pickFile = (f: File | null | undefined) => {
    if (f) setFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const onSubmit = (values: UploadFormValues) => {
    if (!file) {
      toast.error("Pick a file to upload first.");
      return;
    }
    setProgress(0);
    upload.mutate(
      {
        file,
        name: file.name,
        category: values.category,
        clientId: values.clientId || null,
        projectId: values.projectId || null,
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
  };

  const uploading = upload.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !uploading && onOpenChange(o)}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Upload document</DialogTitle>
          <DialogDescription>
            Files upload directly to Cloudinary. Tag them to a client or project
            and choose who can see them.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={FORM_ID}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
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
                {!uploading && (
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

            {uploading && (
              <div className="space-y-1.5">
                <Progress value={progress} />
                <p className="text-right text-xs text-muted-foreground tabular-nums">
                  {progress}%
                </p>
              </div>
            )}

            <SelectField
              control={form.control}
              name="category"
              label="Category"
              placeholder="Select category"
              options={DOCUMENT_CATEGORY_OPTIONS}
              disabled={uploading}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ComboboxField
                control={form.control}
                name="clientId"
                label="Client"
                placeholder="Select client (optional)"
                options={clientOptions}
                disabled={uploading || !!lockedClientId}
              />
              <ComboboxField
                control={form.control}
                name="projectId"
                label="Project"
                placeholder="Select project (optional)"
                options={projectOptions}
                emptyText="No projects for this client."
                disabled={uploading}
              />
            </div>

            <SwitchField
              control={form.control}
              name="clientVisible"
              label="Make visible to the client"
              description="Show this file in the client portal."
              disabled={uploading}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <UploadCloud className="size-4" /> Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
