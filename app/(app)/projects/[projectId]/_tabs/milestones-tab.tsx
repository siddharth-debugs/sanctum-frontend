"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Flag, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerField } from "@/components/fields";
import {
  useProjectMilestones,
  useCreateProjectMilestone,
  useUpdateProjectMilestone,
  useDeleteProjectMilestone,
} from "@/hooks/use-project-milestones";
import { ApiError } from "@/lib/api/client";
import { formatDate, cn } from "@/lib/utils";
import type { ProjectMilestone } from "@/lib/api/types";
import { EmptyState, ListSkeleton } from "./shared";

interface MilestoneFormValues {
  title: string;
  dueDate: string;
}

export function MilestonesTab({ projectId }: { projectId: string }) {
  const { data: milestones, isLoading } = useProjectMilestones(projectId);
  const createMs = useCreateProjectMilestone(projectId);
  const updateMs = useUpdateProjectMilestone(projectId);
  const deleteMs = useDeleteProjectMilestone(projectId);

  const [editing, setEditing] = React.useState<ProjectMilestone | null>(null);
  const [deleting, setDeleting] = React.useState<ProjectMilestone | null>(null);

  const form = useForm<MilestoneFormValues>({
    defaultValues: { title: "", dueDate: "" },
  });

  const onAdd = form.handleSubmit((values) => {
    const t = values.title.trim();
    if (!t) {
      form.setError("title", { message: "A title is required." });
      return;
    }
    createMs.mutate(
      { title: t, dueDate: values.dueDate || null },
      {
        onSuccess: () => form.reset({ title: "", dueDate: "" }),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add milestone",
          ),
      },
    );
  });

  const toggle = (ms: ProjectMilestone, completed: boolean) => {
    updateMs.mutate(
      {
        milestoneId: ms.id,
        input: { status: completed ? "completed" : "pending" },
      },
      {
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't update milestone",
          ),
      },
    );
  };

  const total = milestones?.length ?? 0;
  const done = (milestones ?? []).filter((m) => m.status === "completed").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Add milestone */}
      <Form {...form}>
        <form
          onSubmit={onAdd}
          className="rounded-xl border bg-card p-3 shadow-sm"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
            <div className="flex-1">
              <Input
                {...form.register("title")}
                placeholder="Add a milestone…"
                aria-label="New milestone title"
                aria-invalid={!!form.formState.errors.title}
                className="h-11"
              />
              {form.formState.errors.title && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <DatePickerField
              control={form.control}
              name="dueDate"
              valueAsISO
              placeholder="Due date"
              className="w-full sm:w-44"
            />
            <Button type="submit" disabled={createMs.isPending} className="h-11">
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </form>
      </Form>

      {/* Progress bar */}
      {total > 0 && (
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
          <div className="flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium">Milestone progress</span>
              <span className="tabular-nums text-muted-foreground">
                {done}/{total} · {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : total === 0 ? (
        <EmptyState
          icon={<Flag className="size-5" />}
          title="No milestones yet"
          description="Track major checkpoints and delivery dates for this project."
        />
      ) : (
        <div className="space-y-2">
          {(milestones ?? []).map((ms) => {
            const completed = ms.status === "completed";
            return (
              <div
                key={ms.id}
                className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]"
              >
                <Checkbox
                  checked={completed}
                  onCheckedChange={(v) => toggle(ms, !!v)}
                  aria-label={completed ? "Mark pending" : "Mark complete"}
                  className="size-5"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium leading-tight",
                      completed && "text-muted-foreground line-through",
                    )}
                  >
                    {ms.title}
                  </p>
                  {ms.dueDate && (
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      Due {formatDate(ms.dueDate)}
                    </p>
                  )}
                </div>
                {completed && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                    <CheckCircle2 className="size-3.5" /> Done
                  </span>
                )}
                <div className="flex shrink-0 items-center opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setEditing(ms)}
                    aria-label="Edit milestone"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleting(ms)}
                    aria-label="Delete milestone"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <EditMilestoneDialog
          milestone={editing}
          saving={updateMs.isPending}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            updateMs.mutate(
              { milestoneId: editing.id, input },
              {
                onSuccess: () => {
                  toast.success("Milestone updated");
                  setEditing(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof ApiError
                      ? err.message
                      : "Couldn't save milestone",
                  ),
              },
            )
          }
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete milestone?</DialogTitle>
            <DialogDescription>
              {deleting ? (
                <>
                  This permanently removes <strong>{deleting.title}</strong>.
                  Tasks filed under it become unassigned. This can&apos;t be
                  undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleting(null)}
              disabled={deleteMs.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMs.isPending}
              onClick={() =>
                deleting &&
                deleteMs.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success("Milestone deleted");
                    setDeleting(null);
                  },
                  onError: (err) =>
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Couldn't delete milestone",
                    ),
                })
              }
            >
              {deleteMs.isPending ? "Deleting…" : "Delete milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Edit milestone dialog                                               */
/* ------------------------------------------------------------------ */

function EditMilestoneDialog({
  milestone,
  onClose,
  onSave,
  saving,
}: {
  milestone: ProjectMilestone;
  onClose: () => void;
  onSave: (input: { title: string; dueDate: string | null }) => void;
  saving: boolean;
}) {
  const form = useForm<MilestoneFormValues>({
    defaultValues: {
      title: milestone.title,
      dueDate: milestone.dueDate ? milestone.dueDate.slice(0, 10) : "",
    },
  });

  const submit = form.handleSubmit((values) => {
    const t = values.title.trim();
    if (!t) {
      form.setError("title", { message: "A title is required." });
      return;
    }
    onSave({ title: t, dueDate: values.dueDate || null });
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Edit milestone</DialogTitle>
              <DialogDescription>
                Update the title or due date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title</label>
                <Input
                  {...form.register("title")}
                  aria-invalid={!!form.formState.errors.title}
                  className="h-11"
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              <DatePickerField
                control={form.control}
                name="dueDate"
                label="Due date"
                valueAsISO
                placeholder="No due date"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
