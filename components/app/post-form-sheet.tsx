"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/app/form-sheet";
import {
  SelectField,
  ComboboxField,
  DateField,
  TextareaField,
  SwitchField,
  MediaField,
} from "@/components/fields";
import { postSchema, type PostFormValues } from "@/lib/schemas/post.schema";
import {
  useCreatePost,
  useUpdatePost,
  useTransitionPost,
} from "@/hooks/use-posts";
import { api, ApiError } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Post } from "@/lib/api/types";

const FORM_ID = "post-form";

const TYPE_OPTIONS = [
  { label: "Reel", value: "reel" },
  { label: "Story", value: "story" },
  { label: "Carousel", value: "carousel" },
  { label: "Post", value: "post" },
];

const PLATFORM_OPTIONS = [
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "X", value: "x" },
  { label: "YouTube", value: "youtube" },
];

export function PostFormSheet({
  open,
  onOpenChange,
  clientId,
  post,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  post?: Post | null;
}) {
  const isEdit = !!post;
  const qc = useQueryClient();
  const create = useCreatePost(clientId);
  const update = useUpdatePost(clientId, post?.id ?? "");
  const transition = useTransitionPost(clientId, post?.id ?? "");

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      postType: "reel",
      platforms: [],
      caption: "",
      media: [],
      sendForApproval: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        postType: post?.postType ?? "reel",
        platforms: (post?.platforms as PostFormValues["platforms"]) ?? [],
        scheduledAt: post?.scheduledAt ? new Date(post.scheduledAt) : undefined,
        caption: post?.caption ?? "",
        media: [],
        sendForApproval: post?.status === "pending_approval",
      });
    }
  }, [open, post, form]);

  const onSubmit = async (values: PostFormValues) => {
    const scheduledAt = values.scheduledAt.toISOString();
    try {
      if (isEdit && post) {
        await update.mutateAsync({
          postType: values.postType,
          platforms: values.platforms,
          scheduledAt,
          caption: values.caption,
        });
        // Move into / out of the approval queue if the toggle changed.
        if (values.sendForApproval && post.status === "draft") {
          await transition.mutateAsync("pending_approval");
        }
        toast.success("Post updated");
      } else {
        const createdPost = await create.mutateAsync({
          postType: values.postType,
          platforms: values.platforms,
          scheduledAt,
          caption: values.caption,
          status: "draft",
        });
        if (values.sendForApproval) {
          await api<Post>(
            `/clients/${clientId}/posts/${createdPost.id}/transition`,
            { method: "POST", body: { to: "pending_approval" } },
          );
          qc.invalidateQueries({ queryKey: ["clients", clientId, "posts"] });
        }
        toast.success("Post created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't save the post",
      );
    }
  };

  const pending = create.isPending || update.isPending || transition.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={isEdit ? "Edit post" : "New post"}
      description="Plan the post, attach media, and optionally send it for client approval."
      formId={FORM_ID}
      onSubmit={form.handleSubmit(onSubmit)}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {isEdit ? "Save changes" : "Create post"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="postType"
              label="Format"
              options={TYPE_OPTIONS}
              required
            />
            <ComboboxField
              control={form.control}
              name="platforms"
              label="Platforms"
              options={PLATFORM_OPTIONS}
              multiple
              placeholder="Add platforms…"
              required
            />
          </div>
          <DateField
            control={form.control}
            name="scheduledAt"
            label="Scheduled for"
            withTime
            required
          />
          <TextareaField
            control={form.control}
            name="caption"
            label="Caption"
            placeholder="Write the caption…"
            rows={5}
            maxLength={2200}
            showCount
          />
          <MediaField
            control={form.control}
            name="media"
            label="Assets"
            clientId={clientId}
            postId={post?.id}
            accept="image/*,video/*"
            multiple
          />
          <SwitchField
            control={form.control}
            name="sendForApproval"
            label="Send for client approval"
            description="Notifies the client on their portal and moves the post to Pending."
          />
        </div>
      </Form>
    </FormSheet>
  );
}
