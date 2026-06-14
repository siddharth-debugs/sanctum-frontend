"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { UsersRound, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Form } from "@/components/ui/form";
import { ComboboxField } from "@/components/fields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
} from "@/hooks/use-project-members";
import { useTeam } from "@/hooks/use-team";
import { ROLE_BADGE_CLASS, ROLE_LABEL } from "@/lib/constants/team-options";
import { ApiError } from "@/lib/api/client";
import { initials, cn } from "@/lib/utils";
import type { ProjectMember, Role } from "@/lib/api/types";

import { EmptyState, ListSkeleton } from "./shared";

interface AddMemberValues {
  userId: string;
}

export function TeamTab({ projectId }: { projectId: string }) {
  const { data: members, isLoading } = useProjectMembers(projectId);
  const { data: team } = useTeam();
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);

  const [removing, setRemoving] = React.useState<ProjectMember | null>(null);

  const form = useForm<AddMemberValues>({ defaultValues: { userId: "" } });

  // Only team users who aren't already members.
  const memberUserIds = React.useMemo(
    () => new Set((members ?? []).map((m) => m.userId)),
    [members],
  );
  const candidateOptions = React.useMemo(
    () =>
      (team ?? [])
        .filter((t) => !memberUserIds.has(t.id))
        .map((t) => ({ value: t.id, label: t.fullName ?? t.email })),
    [team, memberUserIds],
  );

  const onAdd = form.handleSubmit((values) => {
    if (!values.userId) {
      form.setError("userId", { message: "Pick someone to add." });
      return;
    }
    addMember.mutate(
      { userId: values.userId },
      {
        onSuccess: () => {
          toast.success("Member added");
          form.reset({ userId: "" });
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add member",
          ),
      },
    );
  });

  return (
    <div className="space-y-5">
      {/* Add member */}
      <Form {...form}>
        <form onSubmit={onAdd} className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
            <div className="flex-1">
              <ComboboxField
                control={form.control}
                name="userId"
                options={candidateOptions}
                placeholder={
                  candidateOptions.length === 0
                    ? "Everyone is already on this project"
                    : "Add a team member…"
                }
                searchPlaceholder="Search people…"
                emptyText="No one left to add."
                disabled={candidateOptions.length === 0}
              />
            </div>
            <Button
              type="submit"
              disabled={addMember.isPending || candidateOptions.length === 0}
              className="h-11"
            >
              <UserPlus className="size-4" />
              Add member
            </Button>
          </div>
        </form>
      </Form>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !members || members.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="size-5" />}
          title="No members yet"
          description="Add agency users so they can pick up tasks and log time here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((m) => {
            const role = m.role as Role;
            const roleLabel = ROLE_LABEL[role] ?? m.role;
            const roleClass =
              ROLE_BADGE_CLASS[role] ?? ROLE_BADGE_CLASS.member;
            return (
              <div
                key={m.id}
                className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
              >
                <Avatar>
                  <AvatarFallback>{initials(m.userName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {m.userName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.userEmail}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                    roleClass,
                  )}
                >
                  {roleLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() => setRemoving(m)}
                  aria-label={`Remove ${m.userName}`}
                >
                  <X className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Remove confirm */}
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              {removing ? (
                <>
                  Remove <strong>{removing.userName}</strong> from this project?
                  They keep their account and any time already logged.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRemoving(null)}
              disabled={removeMember.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMember.isPending}
              onClick={() =>
                removing &&
                removeMember.mutate(removing.id, {
                  onSuccess: () => {
                    toast.success("Member removed");
                    setRemoving(null);
                  },
                  onError: (err) =>
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Couldn't remove member",
                    ),
                })
              }
            >
              {removeMember.isPending ? "Removing…" : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
