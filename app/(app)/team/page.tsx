"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { UserPlus, UserCog } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFacet,
} from "@/components/app/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTeam } from "@/hooks/use-team";
import { initials, formatDate } from "@/lib/utils";
import type { TeamMember } from "@/lib/api/types";

const ROLE_FACET: DataTableFacet = {
  columnId: "role",
  title: "Role",
  options: [
    { label: "Owner", value: "owner" },
    { label: "Admin", value: "admin" },
    { label: "Member", value: "member" },
  ],
};

export default function TeamPage() {
  const { data, isLoading, error } = useTeam();

  const columns = React.useMemo<ColumnDef<TeamMember>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Member" />
        ),
        cell: ({ row }) => {
          const u = row.original;
          const name = u.fullName ?? u.email;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback
                  className="text-xs font-bold text-primary-foreground"
                  style={{
                    background:
                      "linear-gradient(135deg,var(--primary),var(--accent))",
                  }}
                >
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Role" />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.role === "owner" ? "default" : "secondary"}>
            {row.original.role}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "scope",
        header: "Scope",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.role === "owner" || row.original.role === "admin"
              ? "All clients"
              : "Assigned clients"}
          </span>
        ),
      },
      {
        accessorKey: "lastLoginAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last active" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.lastLoginAt
              ? formatDate(row.original.lastLoginAt)
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.status === "active"
                ? "text-success"
                : "text-muted-foreground"
            }
          >
            {row.original.status}
          </Badge>
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
            <UserCog className="size-3" /> Agency
          </>
        }
        title="Team"
        description="Invite staff and assign them to specific clients. Members only see the clients they're assigned to."
        actions={
          <Button>
            <UserPlus className="size-4" /> Invite member
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        error={error ? "Couldn't load your team. Please retry." : null}
        searchKey="fullName"
        searchPlaceholder="Search team…"
        facets={[ROLE_FACET]}
        getRowId={(u) => u.id}
        emptyIcon={<UserCog className="size-8" />}
        emptyTitle="No team members"
        emptyDescription="Invite your first staff member to delegate client work."
      />
    </div>
  );
}
