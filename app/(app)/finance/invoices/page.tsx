"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, FileText, Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { DataTable, DataTableColumnHeader } from "@/components/app/data-table";
import { InvoiceStatusBadge } from "@/components/app/finance-badges";
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
import { DatePickerStandalone } from "@/components/app/date-picker-standalone";
import { useInvoices } from "@/hooks/use-invoices";
import { useClients } from "@/hooks/use-clients";
import { formatDate } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import { INVOICE_STATUS_OPTIONS } from "@/lib/constants/finance-options";
import type { Invoice } from "@/lib/api/types";

const ALL = "all";

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState(ALL);
  const [clientId, setClientId] = React.useState<string>("");
  const [from, setFrom] = React.useState<Date | undefined>();
  const [to, setTo] = React.useState<Date | undefined>();

  const { data: clients } = useClients();
  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const { data, isLoading, error } = useInvoices({
    status: status === ALL ? undefined : status,
    clientId: clientId || undefined,
    from: from ? from.toISOString() : undefined,
    to: to ? to.toISOString() : undefined,
    search: search.trim() || undefined,
  });

  // Belt-and-suspenders client-side filtering.
  const invoices = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((inv) => {
      if (status !== ALL && inv.status !== status) return false;
      if (clientId && inv.clientId !== clientId) return false;
      if (q && !inv.invoiceNumber.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, status, clientId]);

  const columns = React.useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Invoice #" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">
            {row.original.invoiceNumber}
          </span>
        ),
      },
      {
        accessorKey: "clientName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Client" />
        ),
        cell: ({ row }) => (
          <Link
            href={`/clients/${row.original.clientId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium hover:text-primary hover:underline"
          >
            {row.original.clientName}
          </Link>
        ),
      },
      {
        accessorKey: "total",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatINR(row.original.total)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Due date" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {row.original.dueDate ? formatDate(row.original.dueDate) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "itemCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Items" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.itemCount}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <FileText className="size-3" /> Invoices
          </>
        }
        title="Invoices"
        description="Create, send, and track GST-compliant invoices and the payments against them."
        actions={
          <Button asChild>
            <Link href="/finance/invoices/new">
              <Plus className="size-4" /> New invoice
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 lg:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {INVOICE_STATUS_OPTIONS.map((o) => (
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
          className="w-full lg:w-52"
        />
        <DatePickerStandalone
          value={from}
          onChange={setFrom}
          placeholder="From"
          className="w-full lg:w-40"
        />
        <DatePickerStandalone
          value={to}
          onChange={setTo}
          placeholder="To"
          className="w-full lg:w-40"
        />
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        error={error ? "Couldn't load invoices. Please retry." : null}
        getRowId={(i) => i.id}
        onRowClick={(i) => router.push(`/finance/invoices/${i.id}`)}
        enableColumnVisibility={false}
        emptyIcon={<FileText className="size-8" />}
        emptyTitle="No invoices yet"
        emptyDescription="Create your first invoice to start billing clients."
        emptyAction={
          <Button asChild>
            <Link href="/finance/invoices/new">
              <Plus className="size-4" /> New invoice
            </Link>
          </Button>
        }
      />
    </div>
  );
}
