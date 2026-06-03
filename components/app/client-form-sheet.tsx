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
} from "@/components/fields";
import {
  clientSchema,
  type ClientFormValues,
} from "@/lib/schemas/client.schema";
import { useCreateClient, useUpdateClient } from "@/hooks/use-clients";
import { ApiError } from "@/lib/api/client";
import type { Client } from "@/lib/api/types";

const FORM_ID = "client-form";

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
      contactEmail: "",
      brandColor: "",
      instagram: "",
      facebook: "",
      linkedin: "",
      portalVisible: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: client?.name ?? "",
        contactEmail: client?.contactEmail ?? "",
        brandColor: client?.brandColor ?? "",
        instagram: client?.handles?.instagram ?? "",
        facebook: client?.handles?.facebook ?? "",
        linkedin: client?.handles?.linkedin ?? "",
        portalVisible: true,
      });
    }
  }, [open, client, form]);

  const onSubmit = (values: ClientFormValues) => {
    const handles: Record<string, string> = {};
    if (values.instagram) handles.instagram = values.instagram;
    if (values.facebook) handles.facebook = values.facebook;
    if (values.linkedin) handles.linkedin = values.linkedin;

    const payload = {
      name: values.name,
      contactEmail: values.contactEmail || undefined,
      brandColor: values.brandColor || undefined,
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
          ? "Update profile, branding, and social handles."
          : "Add a client to start planning their content."
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
        <div className="space-y-5">
          <TextField
            control={form.control}
            name="name"
            label="Client name"
            placeholder="Bloom Digital"
            required
          />
          <TextField
            control={form.control}
            name="contactEmail"
            label="Contact email"
            type="email"
            placeholder="team@client.com"
            description="Where the welcome portal link is sent."
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
          <SwitchField
            control={form.control}
            name="portalVisible"
            label="Portal visible"
            description="Show this client's non-draft posts in their read-only portal."
          />
        </div>
      </Form>
    </FormSheet>
  );
}
