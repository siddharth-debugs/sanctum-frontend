"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldPlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/app/glass-card";
import { PermissionsEditor } from "@/components/app/permissions-editor";
import {
  useCustomRoles,
  useCreateCustomRole,
  useUpdateCustomRole,
  useDeleteCustomRole,
} from "@/hooks/use-roles";
import { fullAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api/client";
import type { CustomRole, PermissionMap } from "@/lib/api/types";

export function CustomRolesManager({ canEdit }: { canEdit: boolean }) {
  const { data: roles, isLoading } = useCustomRoles();
  const create = useCreateCustomRole();
  const update = useUpdateCustomRole();
  const del = useDeleteCustomRole();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomRole | null>(null);
  const [name, setName] = React.useState("");
  const [baseRole, setBaseRole] = React.useState<"admin" | "member">("member");
  const [perms, setPerms] = React.useState<PermissionMap>(fullAccess());

  const openNew = () => {
    setEditing(null);
    setName("");
    setBaseRole("member");
    setPerms(fullAccess());
    setOpen(true);
  };
  const openEdit = (r: CustomRole) => {
    setEditing(r);
    setName(r.name);
    setBaseRole(r.baseRole);
    setPerms(r.permissions);
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) return toast.error("Name is required.");
    const body = { name: name.trim(), baseRole, permissions: perms };
    const onDone = () => {
      toast.success(editing ? "Role updated" : "Role created");
      setOpen(false);
    };
    const onErr = (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't save role");
    if (editing) update.mutate({ id: editing.id, ...body }, { onSuccess: onDone, onError: onErr });
    else create.mutate(body, { onSuccess: onDone, onError: onErr });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldPlus className="size-4 text-primary" />
          <div>
            <h3 className="font-display text-base font-semibold">Custom roles</h3>
            <p className="text-sm text-muted-foreground">
              Named permission presets you can assign to members (e.g.
              Accountant, Content Manager). Each inherits a base tier.
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> New role
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : !roles || roles.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-muted-foreground">
          No custom roles yet. Create one to assign tailored access to your team.
        </GlassCard>
      ) : (
        <ul className="divide-y rounded-xl border">
          {roles.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold">{r.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                  base: {r.baseRole}
                </span>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => del.mutate(r.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit role" : "New custom role"}</DialogTitle>
            <DialogDescription>
              The base tier governs core privileges (admins can manage team,
              clients, settings; members are client-scoped). The grid sets module
              access on top.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Role name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Accountant, Content Manager…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Base tier</Label>
                <Select value={baseRole} onValueChange={(v) => setBaseRole(v as "admin" | "member")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member (client-scoped)</SelectItem>
                    <SelectItem value="admin">Admin (full privileges)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <PermissionsEditor value={perms} onChange={setPerms} />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={create.isPending || update.isPending}>
              {editing ? "Save role" : "Create role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
