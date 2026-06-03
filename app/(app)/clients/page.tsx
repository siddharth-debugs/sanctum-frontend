"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Users,
  MoreHorizontal,
  CalendarDays,
  Pencil,
  Eye,
  Archive,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFacet,
} from "@/components/app/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/app/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientFormSheet } from "@/components/app/client-form-sheet";
import { ClientViewModal } from "@/components/app/client-view-modal";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useClients } from "@/hooks/use-clients";
import { api, ApiError } from "@/lib/api/client";
import { useDisclosure } from "@/hooks/use-disclosure";
import { initials, formatDate } from "@/lib/utils";
import type { Client } from "@/lib/api/types";

/** Social handles (excluding the synthetic `sector` key the backend folds in). */
function handleCount(client: Client): number {
  if (!client.handles) return 0;
  return Object.keys(client.handles).filter((k) => k !== "sector").length;
}

const STATUS_FACET: DataTableFacet = {
  columnId: "status",
  title: "Status",
  options: [
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
  ],
};

export default function ClientsPage() {
  const { data, isLoading, error } = useClients();
  const qc = useQueryClient();
  const formSheet = useDisclosure<Client | null>();
  const viewModal = useDisclosure<Client>();

  const archive = React.useCallback(
    async (client: Client) => {
      try {
        await api(`/clients/${client.id}/archive`, { method: "POST" });
        toast.success(`${client.name} archived`);
        qc.invalidateQueries({ queryKey: ["clients"] });
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Could not archive client",
        );
      }
    },
    [qc],
  );

  const columns = React.useMemo<ColumnDef<Client>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Client" />
        ),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-[10px] text-xs font-bold text-white"
                style={{ background: c.brandColor ?? "var(--primary)" }}
              >
                {initials(c.name)}
              </span>
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.contactEmail ?? "No contact"}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "handles",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Channels" />
        ),
        cell: ({ row }) => {
          const n = handleCount(row.original);
          return (
            <span className="font-medium">
              {n > 0 ? `${n} channel${n === 1 ? "" : "s"}` : "—"}
            </span>
          );
        },
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
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status === "active" ? "posted" : "draft"}
          />
        ),
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue(id)),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const c = row.original;
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
                  <DropdownMenuItem onClick={() => viewModal.onOpen(c)}>
                    <Eye className="mr-2 size-4" /> View
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/clients/${c.id}/calendar`}>
                      <CalendarDays className="mr-2 size-4" /> Calendar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => formSheet.onOpen(c)}>
                    <Pencil className="mr-2 size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    disabled={c.status === "archived"}
                    onClick={() => archive(c)}
                  >
                    <Archive className="mr-2 size-4" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [formSheet, viewModal, archive],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <Users className="size-3" /> Clients
          </>
        }
        title="Clients"
        description="Manage the brands you produce content for. Each gets a branded, read-only approval portal."
        actions={
          <Button onClick={() => formSheet.onOpen(null)}>
            <Plus className="size-4" /> New client
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        error={error ? "Couldn't load clients. Please retry." : null}
        searchKey="name"
        searchPlaceholder="Search clients…"
        facets={[STATUS_FACET]}
        getRowId={(c) => c.id}
        onRowClick={(c) => viewModal.onOpen(c)}
        emptyIcon={<Users className="size-8" />}
        emptyTitle="No clients yet"
        emptyDescription="Add your first client to start planning their content calendar."
        emptyAction={
          <Button onClick={() => formSheet.onOpen(null)}>
            <Plus className="size-4" /> New client
          </Button>
        }
      />

      <ClientFormSheet
        open={formSheet.open}
        onOpenChange={formSheet.setOpen}
        client={formSheet.data}
      />
      <ClientViewModal
        open={viewModal.open}
        onOpenChange={viewModal.setOpen}
        client={viewModal.data}
        onEdit={(c) => {
          viewModal.onClose();
          formSheet.onOpen(c);
        }}
      />
    </div>
  );
}
