import * as React from "react";
import type { Table } from "@tanstack/react-table";
import { X, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DataTableFacetedFilter,
  type FacetedFilterOption,
} from "./data-table-faceted-filter";
import { DataTableViewOptions } from "./data-table-view-options";

export interface DataTableFacet {
  columnId: string;
  title: string;
  options: FacetedFilterOption[];
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Search…",
  facets,
  actions,
  enableColumnVisibility = true,
}: {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  facets?: DataTableFacet[];
  actions?: React.ReactNode;
  enableColumnVisibility?: boolean;
}) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
      {searchKey && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(e) =>
              table.getColumn(searchKey)?.setFilterValue(e.target.value)
            }
            className="h-9 w-[180px] pl-8 lg:w-[240px]"
          />
        </div>
      )}
      {facets?.map((f) => (
        <DataTableFacetedFilter
          key={f.columnId}
          column={table.getColumn(f.columnId)}
          title={f.title}
          options={f.options}
        />
      ))}
      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetColumnFilters()}
          className="h-9 gap-1 px-2"
        >
          Reset <X className="size-3.5" />
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        {enableColumnVisibility && <DataTableViewOptions table={table} />}
        {actions}
      </div>
    </div>
  );
}
