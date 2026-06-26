"use client";

import * as React from "react";
import { toast } from "sonner";
import { Tag, Plus, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useClientTags,
  useTags,
  useLinkTag,
  useUnlinkTag,
  useCreateTag,
} from "@/hooks/use-crm";
import { useCan, useSession } from "@/app/(app)/session-context";
import { ApiError } from "@/lib/api/client";

export function ClientTags({ clientId }: { clientId: string }) {
  const { data: linked } = useClientTags(clientId);
  const { data: all } = useTags();
  const link = useLinkTag(clientId);
  const unlink = useUnlinkTag(clientId);
  const createTag = useCreateTag();
  const { canManage } = useCan();
  const session = useSession();
  const editable = canManage("clients");
  const isPrivileged = session.user.role === "owner" || session.user.role === "admin";

  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const linkedIds = new Set((linked ?? []).map((t) => t.id));
  const available = (all ?? []).filter((t) => !linkedIds.has(t.id));

  const create = () => {
    if (!newName.trim()) return;
    createTag.mutate(
      { name: newName.trim() },
      {
        onSuccess: (tag) => {
          link.mutate(tag.id);
          setNewName("");
          setCreating(false);
          toast.success("Tag created");
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't create"),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(linked ?? []).map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2.5 py-0.5 text-xs font-medium text-accent"
        >
          {t.name}
          {editable && (
            <button type="button" onClick={() => unlink.mutate(t.id)} className="hover:text-foreground">
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}

      {editable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground">
              <Tag className="size-3" /> Tag
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Add a tag</DropdownMenuLabel>
            {available.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">No more tags.</p>
            )}
            {available.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => link.mutate(t.id)}>
                {t.name}
              </DropdownMenuItem>
            ))}
            {isPrivileged && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setCreating(true); }}>
                  <Plus className="size-3.5" /> Create new tag…
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New tag</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. VIP, Retainer, Churned"
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={create} disabled={createTag.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
