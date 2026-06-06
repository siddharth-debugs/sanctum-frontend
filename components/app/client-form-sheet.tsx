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
  SwitchField,
  SelectField,
  NumberField,
  DateField,
} from "@/components/fields";
import {
  clientSchema,
  type ClientFormValues,
} from "@/lib/schemas/client.schema";
import {
  INDUSTRY_OPTIONS,
  PHONE_CC_OPTIONS,
  CLIENT_SOURCE_OPTIONS,
  RELATIONSHIP_HEALTH_OPTIONS,
  INDIAN_STATE_OPTIONS,
} from "@/lib/constants/client-options";
import { useCreateClient, useUpdateClient } from "@/hooks/use-clients";
import type { ClientInput } from "@/hooks/use-clients";
import { ApiError } from "@/lib/api/client";
import type { Client } from "@/lib/api/types";

const FORM_ID = "client-form";

/** Small muted section heading used between form blocks. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function ClientFormSheet({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}) {
  const isEdit = !!client;
  const create = useCreateClient();
  const update = useUpdateClient(client?.id ?? "");

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      industry: "",
      website: "",
      phoneCc: "+91",
      phone: "",
      contactEmail: "",
      clientSource: "",
      gstNumber: "",
      paymentTermsDays: undefined,
      billingAddress: "",
      billingState: "",
      billingCity: "",
      billingPincode: "",
      relationshipHealth: "",
      nextFollowUpAt: undefined,
      active: true,
      internalNotes: "",
      brandColor: "",
      instagram: "",
      facebook: "",
      linkedin: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: client?.name ?? "",
        industry: client?.industry ?? "",
        website: client?.website ?? "",
        phoneCc: (client?.phoneCc as ClientFormValues["phoneCc"]) ?? "+91",
        phone: client?.phone ?? "",
        contactEmail: client?.contactEmail ?? "",
        clientSource: client?.clientSource ?? "",
        gstNumber: client?.gstNumber ?? "",
        paymentTermsDays: client?.paymentTermsDays ?? undefined,
        billingAddress: client?.billingAddress ?? "",
        billingState: client?.billingState ?? "",
        billingCity: client?.billingCity ?? "",
        billingPincode: client?.billingPincode ?? "",
        relationshipHealth: client?.relationshipHealth ?? "",
        nextFollowUpAt: client?.nextFollowUpAt
          ? new Date(client.nextFollowUpAt)
          : undefined,
        active: client ? client.status === "active" : true,
        internalNotes: client?.internalNotes ?? "",
        brandColor: client?.brandColor ?? "",
        instagram: client?.handles?.instagram ?? "",
        facebook: client?.handles?.facebook ?? "",
        linkedin: client?.handles?.linkedin ?? "",
      });
    }
  }, [open, client, form]);

  const onSubmit = (values: ClientFormValues) => {
    const handles: Record<string, string> = {};
    if (values.instagram) handles.instagram = values.instagram;
    if (values.facebook) handles.facebook = values.facebook;
    if (values.linkedin) handles.linkedin = values.linkedin;

    const payload: ClientInput = {
      name: values.name,
      industry: values.industry || undefined,
      website: values.website || undefined,
      phoneCc: values.phone ? values.phoneCc || undefined : undefined,
      phone: values.phone || undefined,
      contactEmail: values.contactEmail || undefined,
      clientSource: values.clientSource || undefined,
      gstNumber: values.gstNumber || undefined,
      paymentTermsDays:
        typeof values.paymentTermsDays === "number"
          ? values.paymentTermsDays
          : undefined,
      billingAddress: values.billingAddress || undefined,
      billingState: values.billingState || undefined,
      billingCity: values.billingCity || undefined,
      billingPincode: values.billingPincode || undefined,
      relationshipHealth: values.relationshipHealth || undefined,
      nextFollowUpAt: values.nextFollowUpAt
        ? values.nextFollowUpAt.toISOString()
        : undefined,
      internalNotes: values.internalNotes || undefined,
      brandColor: values.brandColor || undefined,
      status: values.active ? "active" : "archived",
      ...(Object.keys(handles).length ? { handles } : {}),
    };

    const mutation = isEdit ? update : create;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? "Client updated" : "Client created");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't save the client",
        );
      },
    });
  };

  const pending = create.isPending || update.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit client" : "New client"}
      description={
        isEdit
          ? "Update company profile, billing, and relationship details."
          : "Add a client to start planning their content and managing the account."
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
            {isEdit ? "Save changes" : "Create client"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <div className="space-y-7">
          {/* COMPANY INFO */}
          <section>
            <SectionHeading>Company info</SectionHeading>
            <div className="space-y-5">
              <TextField
                control={form.control}
                name="name"
                label="Client name"
                placeholder="Bloom Digital"
                required
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="industry"
                  label="Industry"
                  placeholder="Select industry"
                  options={INDUSTRY_OPTIONS}
                />
                <TextField
                  control={form.control}
                  name="website"
                  label="Website"
                  type="url"
                  placeholder="https://client.com"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="grid grid-cols-[5rem_1fr] gap-2">
                    <SelectField
                      control={form.control}
                      name="phoneCc"
                      label="Phone"
                      placeholder="+91"
                      options={PHONE_CC_OPTIONS}
                    />
                    <TextField
                      control={form.control}
                      name="phone"
                      label=" "
                      type="tel"
                      placeholder="98765 43210"
                    />
                  </div>
                </div>
                <TextField
                  control={form.control}
                  name="contactEmail"
                  label="Contact email"
                  type="email"
                  placeholder="team@client.com"
                  description="Where the welcome portal link is sent."
                />
              </div>
              <SelectField
                control={form.control}
                name="clientSource"
                label="Client source"
                placeholder="How did they find you?"
                options={CLIENT_SOURCE_OPTIONS}
              />
            </div>
          </section>

          {/* BILLING */}
          <section>
            <SectionHeading>Billing</SectionHeading>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  control={form.control}
                  name="gstNumber"
                  label="GST number"
                  placeholder="22AAAAA0000A1Z5"
                />
                <NumberField
                  control={form.control}
                  name="paymentTermsDays"
                  label="Payment terms"
                  placeholder="30"
                  min={0}
                  suffix="days"
                />
              </div>
              <TextareaField
                control={form.control}
                name="billingAddress"
                label="Billing address"
                placeholder="Street, area, landmark"
                rows={3}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SelectField
                  control={form.control}
                  name="billingState"
                  label="State"
                  placeholder="Select state"
                  options={INDIAN_STATE_OPTIONS}
                />
                <TextField
                  control={form.control}
                  name="billingCity"
                  label="City"
                  placeholder="Mumbai"
                />
                <TextField
                  control={form.control}
                  name="billingPincode"
                  label="Pincode"
                  placeholder="400001"
                />
              </div>
            </div>
          </section>

          {/* STATUS */}
          <section>
            <SectionHeading>Status</SectionHeading>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="relationshipHealth"
                  label="Relationship health"
                  placeholder="Select health"
                  options={RELATIONSHIP_HEALTH_OPTIONS}
                />
                <DateField
                  control={form.control}
                  name="nextFollowUpAt"
                  label="Next follow-up"
                  placeholder="Pick a date"
                />
              </div>
              <SwitchField
                control={form.control}
                name="active"
                label="Active client"
                description="Inactive clients are archived and hidden from the active list."
              />
              <TextField
                control={form.control}
                name="brandColor"
                label="Brand color"
                placeholder="#1F8FD6"
                description="Hex used to brand their portal."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField
                  control={form.control}
                  name="instagram"
                  label="Instagram"
                  placeholder="@handle"
                />
                <TextField
                  control={form.control}
                  name="facebook"
                  label="Facebook"
                  placeholder="Page"
                />
                <TextField
                  control={form.control}
                  name="linkedin"
                  label="LinkedIn"
                  placeholder="company"
                />
              </div>
              <TextareaField
                control={form.control}
                name="internalNotes"
                label="Internal notes"
                placeholder="Private notes about this account (not shown to the client)."
                rows={4}
              />
            </div>
          </section>
        </div>
      </Form>
    </FormSheet>
  );
}
