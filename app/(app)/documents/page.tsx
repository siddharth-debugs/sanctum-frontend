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
import { useDocuments, useDeleteDocument } from "@/hooks/use-documents";
import { useClients } from "@/hooks/use-clients";
import { useDisclosure } from "@/hooks/use-disclosure";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatBytes } from "@/lib/utils";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/constants/document-options";
import type { Document } from "@/lib/api/types";

const ALL = "all";

export default function DocumentsPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const [clientId, setClientId] = React.useState("");

  const uploadDialog = useDisclosure();
  const preview = useDisclosure<Document>();
  const deleteDialog = useDisclosure<Document>();
  const deleteDocument = useDeleteDocument();

  const { data: clients } = useClients();
  const { data, isLoading, error } = useDocuments({
    category: category === ALL ? undefined : category,
    clientId: clientId || undefined,
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteDialog.onOpen(d)}
                  >
                    <Trash2 className="mr-2 size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [preview, deleteDialog],
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
        description="All client and project files in one place."
        actions={
          <Button onClick={() => uploadDialog.onOpen()}>
            <Plus className="size-4" /> Upload
          </Button>
        }
      />

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
            placeholder="Search documents…"
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

      <DataTable
        columns={columns}
        data={documents}
        isLoading={isLoading}
        error={error ? "Couldn't load documents. Please retry." : null}
        getRowId={(d) => d.id}
        onRowClick={(d) => preview.onOpen(d)}
        enableColumnVisibility={false}
        emptyIcon={<Files className="size-8" />}
        emptyTitle="No documents yet"
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
      />

      <DocumentPreviewModal
        open={preview.open}
        onOpenChange={preview.setOpen}
        doc={preview.data}
      />

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
              onClick={() =>
                deleteDialog.data && onDelete(deleteDialog.data)
              }
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? "Deleting…" : "Delete document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
