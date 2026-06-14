"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/app/form-sheet";
import {
  TextField,
  TextareaField,
  SelectField,
  ComboboxField,
  NumberField,
  DatePickerField,
} from "@/components/fields";
import {
  projectSchema,
  type ProjectFormValues,
} from "@/lib/schemas/project.schema";
import {
  PROJECT_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_HEALTH_OPTIONS,
} from "@/lib/constants/project-options";
import {
  useCreateProject,
  useUpdateProject,
  type ProjectInput,
} from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { ApiError } from "@/lib/api/client";
import type { Project } from "@/lib/api/types";

const FORM_ID = "project-form";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function ProjectFormSheet({
  open,
  onOpenChange,
  project,
  lockedClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  /** When set, the client is preselected and the picker is locked. */
  lockedClientId?: string;
}) {
  const isEdit = !!project;
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? "");
  const { data: clients } = useClients();

  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: lockedClientId ?? "",
      type: "fixed_price",
      status: "planning",
      health: "on_track",
      contractValue: undefined,
      startDate: undefined,
      deadline: undefined,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name ?? "",
        description: project?.description ?? "",
        clientId: project?.clientId ?? lockedClientId ?? "",
        type: project?.type ?? "fixed_price",
        status: project?.status ?? "planning",
        health: project?.health ?? "on_track",
        contractValue:
          typeof project?.contractValue === "number"
            ? project.contractValue
            : undefined,
        startDate: project?.startDate ? new Date(project.startDate) : undefined,
        deadline: project?.deadline ? new Date(project.deadline) : undefined,
      });
    }
  }, [open, project, lockedClientId, form]);

  const onSubmit = (values: ProjectFormValues) => {
    const payload: ProjectInput = {
      name: values.name,
      description: values.description || undefined,
      clientId: values.clientId,
      type: values.type,
      status: values.status,
      health: values.health,
      currency: "INR",
      contractValue:
        typeof values.contractValue === "number"
          ? values.contractValue
          : undefined,
      startDate: values.startDate ? values.startDate.toISOString() : null,
      deadline: values.deadline ? values.deadline.toISOString() : null,
    };

    const mutation = isEdit ? update : create;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? "Project updated" : "Project created");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't save the project",
        );
      },
    });
  };

  const pending = create.isPending || update.isPending;
  const clientLocked = !!lockedClientId && !isEdit;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit project" : "New project"}
      description={
        isEdit
          ? "Update scope, status, contract value, and timeline."
          : "Spin up a project to track tasks, milestones, and the team."
      }
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
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {isEdit ? "Save changes" : "Create project"}
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
                name="name"
                label="Project name"
                placeholder="Q3 Brand Campaign"
                required
              />
              <ComboboxField
                control={form.control}
                name="clientId"
                label="Client"
                placeholder="Select client"
                options={clientOptions}
                required
                disabled={clientLocked}
                description={
                  clientLocked
                    ? "Preselected for this client."
                    : "The client this project belongs to."
                }
              />
              <TextareaField
                control={form.control}
                name="description"
                label="Description"
                placeholder="Scope, goals, and notes for this project."
                rows={3}
              />
            </div>
          </section>

          <section>
            <SectionHeading>Scope &amp; status</SectionHeading>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="type"
                  label="Type"
                  placeholder="Select type"
                  options={PROJECT_TYPE_OPTIONS}
                  required
                />
                <NumberField
                  control={form.control}
                  name="contractValue"
                  label="Contract value"
                  placeholder="0"
                  min={0}
                  prefix="₹"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="status"
                  label="Status"
                  placeholder="Select status"
                  options={PROJECT_STATUS_OPTIONS}
                  required
                />
                <SelectField
                  control={form.control}
                  name="health"
                  label="Health"
                  placeholder="Select health"
                  options={PROJECT_HEALTH_OPTIONS}
                  required
                />
              </div>
            </div>
          </section>

          <section>
            <SectionHeading>Timeline</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePickerField
                control={form.control}
                name="startDate"
                label="Start date"
                placeholder="Pick a date"
              />
              <DatePickerField
                control={form.control}
                name="deadline"
                label="Deadline"
                placeholder="Pick a date"
              />
            </div>
          </section>
        </div>
      </Form>
    </FormSheet>
  );
}
