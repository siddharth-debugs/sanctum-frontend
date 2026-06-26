"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Mail, Phone, Star, Receipt } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  type ContactInput,
} from "@/hooks/use-crm";
import { useCan } from "@/app/(app)/session-context";
import { ApiError } from "@/lib/api/client";
import type { ClientContact } from "@/lib/api/types";

const EMPTY: ContactInput = {
  name: "",
  role: "",
  email: "",
  phone: "",
  isPrimary: false,
  isBilling: false,
};

export function ContactsPanel({ clientId }: { clientId: string }) {
  const { data: contacts, isLoading } = useContacts(clientId);
  const create = useCreateContact(clientId);
  const update = useUpdateContact(clientId);
  const del = useDeleteContact(clientId);
  const { canManage } = useCan();
  const editable = canManage("clients");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ClientContact | null>(null);
  const [form, setForm] = React.useState<ContactInput>(EMPTY);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (c: ClientContact) => {
    setEditing(c);
    setForm({
      name: c.name,
      role: c.role ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      isPrimary: c.isPrimary,
      isBilling: c.isBilling,
      notes: c.notes ?? "",
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return toast.error("Name is required.");
    const body: ContactInput = {
      name: form.name.trim(),
      role: form.role?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      isPrimary: form.isPrimary,
      isBilling: form.isBilling,
      notes: form.notes?.trim() || null,
    };
    const onDone = () => {
      toast.success(editing ? "Contact updated" : "Contact added");
      setOpen(false);
    };
    const onErr = (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't save");
    if (editing) update.mutate({ id: editing.id, ...body }, { onSuccess: onDone, onError: onErr });
    else create.mutate(body, { onSuccess: onDone, onError: onErr });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Contacts</CardTitle>
        {editable && (
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4" /> Add contact
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : !contacts || contacts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No contacts yet. Add the people you work with at this client.
          </p>
        ) : (
          <ul className="divide-y">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {c.name}
                    {c.role && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {c.role}
                      </span>
                    )}
                    {c.isPrimary && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Star className="size-2.5" /> Primary
                      </span>
                    )}
                    {c.isBilling && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-accent">
                        <Receipt className="size-2.5" /> Billing
                      </span>
                    )}
                  </p>
                  <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {c.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" /> {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" /> {c.phone}
                      </span>
                    )}
                  </p>
                </div>
                {editable && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => del.mutate(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "Add contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={form.role ?? ""} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Founder, Finance…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isPrimary} onCheckedChange={(v) => setForm({ ...form, isPrimary: v })} /> Primary contact
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isBilling} onCheckedChange={(v) => setForm({ ...form, isBilling: v })} /> Billing contact
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={create.isPending || update.isPending}>
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
