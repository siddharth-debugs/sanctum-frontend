"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Receipt,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { DataTable, DataTableColumnHeader } from "@/components/app/data-table";
import { ExpenseCategoryBadge } from "@/components/app/finance-badges";
import { ExpenseFormSheet } from "@/components/app/expense-form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePickerStandalone } from "@/components/app/date-picker-standalone";
import { useExpenses, useDeleteExpense } from "@/hooks/use-expenses";
import { useDisclosure } from "@/hooks/use-disclosure";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/constants/finance-options";
import type { Expense } from "@/lib/api/types";

const ALL = "all";

export default function ExpensesPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const [from, setFrom] = React.useState<Date | undefined>();
  const [to, setTo] = React.useState<Date | undefined>();

  const formSheet = useDisclosure<Expense | null>();
  const deleteExpense = useDeleteExpense();

  const { data, isLoading, error } = useExpenses({
    category: category === ALL ? undefined : category,
    from: from ? from.toISOString() : undefined,
    to: to ? to.toISOString() : undefined,
    search: search.trim() || undefined,
  });

  const expenses = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (category !== ALL && e.category !== category) return false;
      if (
        q &&
        !(e.description ?? "").toLowerCase().includes(q) &&
        !(e.clientName ?? "").toLowerCase().includes(q) &&
        !(e.projectName ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, category]);

  const onDelete = React.useCallback(
    (expense: Expense) => {
      deleteExpense.mutate(expense.id, {
        onSuccess: () => toast.success("Expense deleted"),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Couldn't delete"),
      });
    },
    [deleteExpense],
  );

  const columns = React.useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: "expenseDate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatDate(row.original.expenseDate)}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => (
          <ExpenseCategoryBadge category={row.original.category} />
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Description" />
        ),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.description || "—"}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatINR(row.original.amount)}
          </span>
        ),
      },
      {
        id: "project",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Project" />
        ),
        cell: ({ row }) => {
          const e = row.original;
          return e.projectId && e.projectName ? (
            <Link
              href={`/projects/${e.projectId}`}
              onClick={(ev) => ev.stopPropagation()}
              className="text-sm text-primary hover:underline"
            >
              {e.projectName}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "gst",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="GST" />
        ),
        cell: ({ row }) =>
          row.original.gstDeductible ? (
            <Badge variant="secondary">Deductible</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "loggedByName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Logged by" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.loggedByName || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const e = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => formSheet.onOpen(e)}>
                    <Pencil className="mr-2 size-4" /> Edit
                  </DropdownMenuItem>
                  {e.receiptUrl && (
                    <DropdownMenuItem asChild>
                      <a
                        href={e.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 size-4" /> View receipt
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(e)}
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
    [formSheet, onDelete],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <Receipt className="size-3" /> Expenses
          </>
        }
        title="Expenses"
        description="Track costs across software, salaries, marketing, and more — tagged to clients and projects."
        actions={
          <Button onClick={() => formSheet.onOpen(null)}>
            <Plus className="size-4" /> Log expense
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 lg:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses…"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {EXPENSE_CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        data={expenses}
        isLoading={isLoading}
        error={error ? "Couldn't load expenses. Please retry." : null}
        getRowId={(e) => e.id}
        onRowClick={(e) => formSheet.onOpen(e)}
        enableColumnVisibility={false}
        emptyIcon={<Receipt className="size-8" />}
        emptyTitle="No expenses yet"
        emptyDescription="Log your first expense to start tracking costs."
        emptyAction={
          <Button onClick={() => formSheet.onOpen(null)}>
            <Plus className="size-4" /> Log expense
          </Button>
        }
      />

      <ExpenseFormSheet
        open={formSheet.open}
        onOpenChange={formSheet.setOpen}
        expense={formSheet.data}
      />
    </div>
  );
}
