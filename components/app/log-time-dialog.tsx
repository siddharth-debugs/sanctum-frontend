"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  NumberField,
  TextareaField,
  ComboboxField,
  DateField,
} from "@/components/fields";
import { useLogTime } from "@/hooks/use-team";
import { useProjects } from "@/hooks/use-projects";
import { ApiError } from "@/lib/api/client";

const FORM_ID = "log-time-form";

const logTimeSchema = z.object({
  hours: z.number().min(0).max(24).optional(),
  minutes: z.number().min(0).max(59).optional(),
  projectId: z.string().optional().or(z.literal("")),
  workDate: z.date().optional(),
  note: z.string().max(500).optional().or(z.literal("")),
});

type LogTimeValues = z.infer<typeof logTimeSchema>;

export function LogTimeDialog({
  open,
  onOpenChange,
  memberId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
}) {
  const logTime = useLogTime(memberId);
  const { data: projects } = useProjects();

  const projectOptions = React.useMemo(
    () => (projects ?? []).map((p) => ({ label: p.name, value: p.id })),
    [projects],
  );

  const form = useForm<LogTimeValues>({
    resolver: zodResolver(logTimeSchema),
    defaultValues: {
      hours: undefined,
      minutes: undefined,
      projectId: "",
      workDate: new Date(),
      note: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        hours: undefined,
        minutes: undefined,
        projectId: "",
        workDate: new Date(),
        note: "",
      });
    }
  }, [open, form]);

  const onSubmit = (values: LogTimeValues) => {
    const total = (values.hours ?? 0) * 60 + (values.minutes ?? 0);
    if (total <= 0) {
      form.setError("hours", { message: "Enter at least some time." });
      return;
    }
    logTime.mutate(
      {
        minutes: total,
        projectId: values.projectId || undefined,
        workDate: values.workDate ? values.workDate.toISOString() : undefined,
        note: values.note || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Time logged");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't log time",
          ),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log time</DialogTitle>
          <DialogDescription>
            Record hours worked, optionally against a project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id={FORM_ID}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                control={form.control}
                name="hours"
                label="Hours"
                placeholder="2"
                min={0}
                max={24}
                suffix="h"
              />
              <NumberField
                control={form.control}
                name="minutes"
                label="Minutes"
                placeholder="30"
                min={0}
                max={59}
                suffix="m"
              />
            </div>
            <ComboboxField
              control={form.control}
              name="projectId"
              label="Project"
              placeholder="No project"
              options={projectOptions}
              emptyText="No projects."
            />
            <DateField
              control={form.control}
              name="workDate"
              label="Date"
              placeholder="Pick a date"
            />
            <TextareaField
              control={form.control}
              name="note"
              label="Note"
              placeholder="What did you work on?"
              rows={3}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={logTime.isPending}>
            {logTime.isPending ? "Logging…" : "Log time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
