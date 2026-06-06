"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
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
  DateField,
  SwitchField,
} from "@/components/fields";
import {
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/schemas/expense.schema";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/constants/finance-options";
import {
  useCreateExpense,
  useUpdateExpense,
  type ExpenseInput,
} from "@/hooks/use-expenses";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { ApiError } from "@/lib/api/client";
import { toPaise } from "@/lib/money";
import type { Expense } from "@/lib/api/types";

const FORM_ID = "expense-form";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function ExpenseFormSheet({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}) {
  const isEdit = !!expense;
  const create = useCreateExpense();
  const update = useUpdateExpense(expense?.id ?? "");

  const { data: clients } = useClients();
  const { data: projects } = useProjects();

  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "software",
      amount: undefined,
      description: "",
      projectId: "",
      clientId: "",
      expenseDate: new Date(),
      receiptUrl: "",
      gstDeductible: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        category: expense?.category ?? "software",
        amount: expense ? expense.amount / 100 : undefined, // paise → rupees
        description: expense?.description ?? "",
        projectId: expense?.projectId ?? "",
        clientId: expense?.clientId ?? "",
        expenseDate: expense?.expenseDate
          ? new Date(expense.expenseDate)
          : new Date(),
        receiptUrl: expense?.receiptUrl ?? "",
        gstDeductible: expense ? expense.gstDeductible === 1 : false,
      });
    }
  }, [open, expense, form]);

  const selectedClientId = useWatch({ control: form.control, name: "clientId" });
  const projectOptions = React.useMemo(
    () =>
      (projects ?? [])
        .filter((p) => !selectedClientId || p.clientId === selectedClientId)
        .map((p) => ({ label: p.name, value: p.id })),
    [projects, selectedClientId],
  );

  const onSubmit = (values: ExpenseFormValues) => {
    const payload: ExpenseInput = {
      category: values.category,
      amount: toPaise(Number(values.amount) || 0),
      description: values.description || null,
      projectId: values.projectId || null,
      clientId: values.clientId || null,
      expenseDate: values.expenseDate
        ? values.expenseDate.toISOString()
        : null,
      receiptUrl: values.receiptUrl || null,
      gstDeductible: values.gstDeductible ? 1 : 0,
    };

    const mutation = isEdit ? update : create;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? "Expense updated" : "Expense logged");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't save the expense",
        );
      },
    });
  };

  const pending = create.isPending || update.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit expense" : "Log expense"}
      description={
        isEdit
          ? "Update the amount, category, and tagging for this expense."
          : "Record a cost and optionally tag it to a client or project."
      }
      formId={FORM_ID}
      onSubmit={form.handleSubmit(onSubmit)}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {isEdit ? "Save changes" : "Log expense"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <div className="space-y-7">
          <section>
            <SectionHeading>Expense</SectionHeading>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="category"
                  label="Category"
                  placeholder="Select category"
                  options={EXPENSE_CATEGORY_OPTIONS}
                  required
                />
                <NumberField
                  control={form.control}
                  name="amount"
                  label="Amount"
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  prefix="₹"
                  required
                />
              </div>
              <TextareaField
                control={form.control}
                name="description"
                label="Description"
                placeholder="What was this for?"
                rows={2}
              />
              <DateField
                control={form.control}
                name="expenseDate"
                label="Date"
              />
            </div>
          </section>

          <section>
            <SectionHeading>Tagging</SectionHeading>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ComboboxField
                  control={form.control}
                  name="clientId"
                  label="Client"
                  placeholder="Select client (optional)"
                  options={clientOptions}
                />
                <ComboboxField
                  control={form.control}
                  name="projectId"
                  label="Project"
                  placeholder="Select project (optional)"
                  options={projectOptions}
                  emptyText="No projects for this client."
                />
              </div>
              <TextField
                control={form.control}
                name="receiptUrl"
                label="Receipt URL"
                placeholder="https://…"
                type="url"
              />
              <SwitchField
                control={form.control}
                name="gstDeductible"
                label="GST deductible"
                description="Mark if input tax credit can be claimed on this expense."
              />
            </div>
          </section>
        </div>
      </Form>
    </FormSheet>
  );
}
