"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/app/form-sheet";
import {
  TextField,
  TextareaField,
  ComboboxField,
} from "@/components/fields";
import { useTeam } from "@/hooks/use-team";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { useCreateThread } from "@/hooks/use-messages";
import { useSession } from "@/app/(app)/session-context";
import { ApiError } from "@/lib/api/client";
import type { ThreadSummary } from "@/lib/api/types";

const FORM_ID = "new-thread-form";

const newThreadSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  participantIds: z.array(z.string()).min(1, "Pick at least one participant"),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  body: z.string().optional(),
});

type NewThreadValues = z.infer<typeof newThreadSchema>;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function NewThreadSheet({
  open,
  onOpenChange,
  onCreated,
  /** Pre-select (and lock) a client — e.g. starting a thread from a client page. */
  defaultClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (thread: ThreadSummary) => void;
  defaultClientId?: string;
}) {
  const session = useSession();
  const create = useCreateThread();
  const { data: team } = useTeam();
  const { data: clients } = useClients();

  const form = useForm<NewThreadValues>({
    resolver: zodResolver(newThreadSchema),
    defaultValues: {
      subject: "",
      participantIds: [],
      clientId: defaultClientId ?? "",
      projectId: "",
      body: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        subject: "",
        participantIds: [],
        clientId: defaultClientId ?? "",
        projectId: "",
        body: "",
      });
    }
  }, [open, form, defaultClientId]);

  // Filter projects by the selected client (if any).
  const selectedClientId = form.watch("clientId");
  const { data: projects } = useProjects(
    selectedClientId ? { clientId: selectedClientId } : undefined,
  );

  // Exclude the current user from the picker — they're always a participant.
  const teamOptions = React.useMemo(
    () =>
      (team ?? [])
        .filter((m) => m.id !== session.user.id)
        .map((m) => ({
          label: m.fullName ?? m.email,
          value: m.id,
        })),
    [team, session.user.id],
  );

  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const projectOptions = React.useMemo(
    () => (projects ?? []).map((p) => ({ label: p.name, value: p.id })),
    [projects],
  );

  const onSubmit = (values: NewThreadValues) => {
    create.mutate(
      {
        subject: values.subject.trim(),
        participantIds: values.participantIds,
        clientId: values.clientId || undefined,
        projectId: values.projectId || undefined,
        body: values.body?.trim() || undefined,
      },
      {
        onSuccess: (thread) => {
          toast.success("Thread created");
          onOpenChange(false);
          onCreated?.(thread);
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Couldn't create the thread",
          );
        },
      },
    );
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New thread"
      description="Start a conversation with your team. Optionally link it to a client or project."
      formId={FORM_ID}
      onSubmit={form.handleSubmit(onSubmit)}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={create.isPending}>
            Create thread
          </Button>
        </>
      }
    >
      <Form {...form}>
        <div className="space-y-7">
          <section>
            <SectionHeading>Details</SectionHeading>
            <div className="space-y-5">
              <TextField
                control={form.control}
                name="subject"
                label="Subject"
                placeholder="What's this conversation about?"
                required
              />
              <ComboboxField
                control={form.control}
                name="participantIds"
                label="Participants"
                placeholder="Add team members"
                options={teamOptions}
                multiple
                required
                emptyText="No teammates found."
                description="You're automatically included."
              />
            </div>
          </section>

          <section>
            <SectionHeading>Link (optional)</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ComboboxField
                control={form.control}
                name="clientId"
                label="Client"
                placeholder="Select client"
                options={clientOptions}
                emptyText="No clients."
                disabled={!!defaultClientId}
              />
              <ComboboxField
                control={form.control}
                name="projectId"
                label="Project"
                placeholder="Select project"
                options={projectOptions}
                emptyText={
                  selectedClientId ? "No projects." : "Pick a client first."
                }
                disabled={!selectedClientId}
              />
            </div>
          </section>

          <section>
            <SectionHeading>First message (optional)</SectionHeading>
            <TextareaField
              control={form.control}
              name="body"
              placeholder="Write the first message…"
              rows={4}
            />
          </section>
        </div>
      </Form>
    </FormSheet>
  );
}
