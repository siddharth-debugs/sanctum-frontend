"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Sheet as SheetIcon,
  MoreHorizontal,
  Copy,
  Trash2,
  ExternalLink,
  User,
  Building2,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  useSheets,
  useCreateSheet,
  useDuplicateSheet,
  useDeleteSheet,
} from "@/hooks/use-sheets";
import { useDisclosure } from "@/hooks/use-disclosure";
import { ApiError } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/relative-time";
import type { SheetSummary } from "@/lib/api/types";

export default function SheetsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useSheets();

  const createSheet = useCreateSheet();
  const duplicateSheet = useDuplicateSheet();
  const deleteSheet = useDeleteSheet();
  const deleteDialog = useDisclosure<SheetSummary>();

  const onCreate = React.useCallback(() => {
    createSheet.mutate(
      {},
      {
        onSuccess: (sheet) => router.push(`/sheets/${sheet.id}`),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't create sheet",
          ),
      },
    );
  }, [createSheet, router]);

  const onDuplicate = React.useCallback(
    (sheet: SheetSummary) => {
      duplicateSheet.mutate(sheet.id, {
        onSuccess: (copy) => {
          toast.success("Sheet duplicated");
          router.push(`/sheets/${copy.id}`);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't duplicate",
          ),
      });
    },
    [duplicateSheet, router],
  );

  const onDelete = React.useCallback(
    (sheet: SheetSummary) => {
      deleteSheet.mutate(sheet.id, {
        onSuccess: () => {
          toast.success("Sheet deleted");
          deleteDialog.onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Couldn't delete"),
      });
    },
    [deleteSheet, deleteDialog],
  );

  const sheets = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <SheetIcon className="size-3" /> Sheets
          </>
        }
        title="Sheets"
        description="Create and manage your spreadsheets."
        actions={
          <Button onClick={onCreate} disabled={createSheet.isPending}>
            <Plus className="size-4" />
            {createSheet.isPending ? "Creating…" : "New Sheet"}
          </Button>
        }
      />

      {error ? (
        <Card className="items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load sheets. Please retry.
          </p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="gap-4 p-5">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : sheets.length === 0 ? (
        <Card className="items-center justify-center gap-4 py-20 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
            <SheetIcon className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold">No sheets yet</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Spin up your first spreadsheet — formulas, formatting, and
              autosave included.
            </p>
          </div>
          <Button onClick={onCreate} disabled={createSheet.isPending}>
            <Plus className="size-4" /> New Sheet
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sheets.map((sheet) => (
            <SheetCard
              key={sheet.id}
              sheet={sheet}
              onOpen={() => router.push(`/sheets/${sheet.id}`)}
              onDuplicate={() => onDuplicate(sheet)}
              onDelete={() => deleteDialog.onOpen(sheet)}
            />
          ))}
        </div>
      )}

      <Dialog open={deleteDialog.open} onOpenChange={deleteDialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this sheet?</DialogTitle>
            <DialogDescription>
              {deleteDialog.data?.title
                ? `“${deleteDialog.data.title}” will be permanently removed. This can't be undone.`
                : "This sheet will be permanently removed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => deleteDialog.onClose()}
              disabled={deleteSheet.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.data && onDelete(deleteDialog.data)}
              disabled={deleteSheet.isPending}
            >
              {deleteSheet.isPending ? "Deleting…" : "Delete sheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SheetCard({
  sheet,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  sheet: SheetSummary;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer gap-4 p-5 transition-colors hover:border-ring hover:shadow-md focus-visible:border-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between">
        <div className="grid size-10 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
          <SheetIcon className="size-5" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 opacity-60 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onOpen}>
              <ExternalLink className="mr-2 size-4" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <h3 className="line-clamp-1 font-display text-base font-semibold tracking-tight group-hover:text-primary">
          {sheet.title || "Untitled sheet"}
        </h3>
        <p className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(sheet.updatedAt)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {sheet.createdByName && (
          <span className="inline-flex items-center gap-1">
            <User className="size-3" />
            {sheet.createdByName}
          </span>
        )}
        {sheet.clientName && (
          <span className="inline-flex items-center gap-1 rounded-full border bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-2 py-0.5">
            <Building2 className="size-3" />
            {sheet.clientName}
          </span>
        )}
        {sheet.projectName && (
          <span className="inline-flex items-center gap-1 rounded-full border bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5">
            <FolderKanban className="size-3" />
            {sheet.projectName}
          </span>
        )}
      </div>
    </Card>
  );
}
