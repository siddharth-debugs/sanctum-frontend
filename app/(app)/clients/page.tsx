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
import { HealthBadge } from "@/components/app/health-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientFormSheet } from "@/components/app/client-form-sheet";
import { ClientViewModal } from "@/components/app/client-view-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineBoard } from "@/components/app/crm/pipeline-board";
import { FollowUpsCard } from "@/components/app/crm/follow-ups-card";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useClients } from "@/hooks/use-clients";
import { api, ApiError } from "@/lib/api/client";
import { useDisclosure } from "@/hooks/use-disclosure";
import { initials, formatDate, cn } from "@/lib/utils";
import { useSession } from "../session-context";
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
  const session = useSession();
  // Create/edit/archive are owner/admin-only on the backend — gate the UI to match.
  const canManage =
    session.user.role === "owner" || session.user.role === "admin";
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
        id: "industry",
        accessorFn: (c) => c.industry ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Industry" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.industry || "—"}
          </span>
        ),
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
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                row.original.status === "active"
                  ? "text-success bg-[color-mix(in_srgb,var(--success)_15%,transparent)]"
                  : "text-muted-foreground bg-muted",
              )}
            >
              {row.original.status === "active" ? "Active" : "Archived"}
            </span>
            <HealthBadge health={row.original.relationshipHealth} />
          </div>
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
                  <DropdownMenuItem asChild>
                    <Link href={`/clients/${c.id}`}>
                      <Eye className="mr-2 size-4" /> Open details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => viewModal.onOpen(c)}>
                    <Eye className="mr-2 size-4" /> Quick view
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/clients/${c.id}/calendar`}>
                      <CalendarDays className="mr-2 size-4" /> Calendar
                    </Link>
                  </DropdownMenuItem>
                  {canManage && (
                    <DropdownMenuItem onClick={() => formSheet.onOpen(c)}>
                      <Pencil className="mr-2 size-4" /> Edit
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={c.status === "archived"}
                        onClick={() => archive(c)}
                      >
                        <Archive className="mr-2 size-4" /> Archive
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [formSheet, viewModal, archive, canManage],
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
          canManage ? (
            <Button onClick={() => formSheet.onOpen(null)}>
              <Plus className="size-4" /> New client
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-5">
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
            emptyDescription={
              canManage
                ? "Add your first client to start planning their content calendar."
                : "You haven't been assigned to any clients yet."
            }
            emptyAction={
              canManage ? (
                <Button onClick={() => formSheet.onOpen(null)}>
                  <Plus className="size-4" /> New client
                </Button>
              ) : undefined
            }
          />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-5">
          <PipelineBoard />
        </TabsContent>

        <TabsContent value="followups" className="mt-5">
          <FollowUpsCard />
        </TabsContent>
      </Tabs>

      <ClientFormSheet
        open={formSheet.open}
        onOpenChange={formSheet.setOpen}
        client={formSheet.data}
      />
      <ClientViewModal
        open={viewModal.open}
        onOpenChange={viewModal.setOpen}
        client={viewModal.data}
        onEdit={
          canManage
            ? (c) => {
                viewModal.onClose();
                formSheet.onOpen(c);
              }
            : undefined
        }
      />
    </div>
  );
}
